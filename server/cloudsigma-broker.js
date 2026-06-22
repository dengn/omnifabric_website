const crypto = require("node:crypto");

const STATE_COOKIE = "of_auth_state";
const STATE_MAX_AGE_SECONDS = 10 * 60;

async function handleRequest(request, env = {}, deps = {}) {
  const url = new URL(request.url);
  const fetchImpl = deps.fetch || fetch;

  if (request.method !== "GET") {
    return textResponse("method not allowed", 405);
  }

  if (url.pathname === "/auth/cloudsigma/login" || url.pathname === "/auth/cloudsigma/register") {
    return startAuth(url, env, url.pathname.endsWith("/register") ? "register" : "login");
  }

  if (url.pathname === "/auth/cloudsigma/callback") {
    return finishAuth(request, url, env, fetchImpl);
  }

  return textResponse("not found", 404);
}

function startAuth(url, env, mode) {
  const cfg = readConfig(env);
  const statePayload = {
    state: randomToken(),
    nonce: randomToken(),
    redirectUrl: sanitizeRedirectUrl(url.searchParams.get("redirect"), cfg.moiAppUrl),
    issuedAt: Date.now(),
    mode,
  };
  const authUrl = new URL(
    mode === "register"
      ? `${cfg.issuer}/protocol/openid-connect/registrations`
      : `${cfg.issuer}/protocol/openid-connect/auth`,
  );
  authUrl.searchParams.set("client_id", cfg.clientId);
  authUrl.searchParams.set("response_type", "code");
  authUrl.searchParams.set("scope", "openid profile email");
  authUrl.searchParams.set("redirect_uri", callbackUrl(url));
  authUrl.searchParams.set("state", statePayload.state);
  authUrl.searchParams.set("nonce", statePayload.nonce);

  return redirectResponse(authUrl.href, {
    "set-cookie": `${STATE_COOKIE}=${signStateCookie(statePayload, cfg.cookieSecret)}; Path=/auth/cloudsigma; Max-Age=${STATE_MAX_AGE_SECONDS}; HttpOnly; Secure; SameSite=Lax`,
  });
}

async function finishAuth(request, url, env, fetchImpl) {
  const cfg = readConfig(env);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  if (!code || !state) {
    return textResponse("missing code or state", 400);
  }

  const statePayload = verifyStateCookie(readCookie(request, STATE_COOKIE), cfg.cookieSecret);
  if (!statePayload || statePayload.state !== state || Date.now() - statePayload.issuedAt > STATE_MAX_AGE_SECONDS * 1000) {
    return textResponse("invalid state", 400);
  }

  const token = await exchangeCodeForToken(fetchImpl, cfg, callbackUrl(url), code);
  const profile = await fetchCloudSigmaProfile(fetchImpl, cfg, token.access_token);
  const ssoToken = await createMoiSSOToken(fetchImpl, cfg, profile);
  const bridgeUrl = buildMoiBridgeUrl(cfg.moiAppUrl, ssoToken, statePayload.redirectUrl);

  return redirectResponse(bridgeUrl, {
    "set-cookie": `${STATE_COOKIE}=; Path=/auth/cloudsigma; Max-Age=0; HttpOnly; Secure; SameSite=Lax`,
  });
}

async function exchangeCodeForToken(fetchImpl, cfg, redirectUri, code) {
  const body = new URLSearchParams();
  body.set("grant_type", "authorization_code");
  body.set("client_id", cfg.clientId);
  body.set("client_secret", cfg.clientSecret);
  body.set("redirect_uri", redirectUri);
  body.set("code", code);

  const res = await fetchImpl(`${cfg.issuer}/protocol/openid-connect/token`, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });
  const payload = await readJson(res);
  if (!res.ok || !payload.access_token) {
    throw new Error(`CloudSigma token exchange failed: ${res.status}`);
  }
  return payload;
}

async function fetchCloudSigmaProfile(fetchImpl, cfg, accessToken) {
  const res = await fetchImpl(`${cfg.issuer}/protocol/openid-connect/userinfo`, {
    headers: { authorization: `Bearer ${accessToken}` },
  });
  const payload = await readJson(res);
  if (!res.ok || !payload.sub || !payload.email) {
    throw new Error(`CloudSigma userinfo failed: ${res.status}`);
  }
  if (payload.email_verified === false) {
    throw new Error("CloudSigma email is not verified");
  }
  return payload;
}

async function createMoiSSOToken(fetchImpl, cfg, profile) {
  const res = await fetchImpl(`${trimTrailingSlash(cfg.moiAppUrl)}/newmoi/internal/cloudsigma/login`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "X-MOI-Internal-Token": cfg.moiInternalToken,
    },
    body: JSON.stringify({
      cloudsigma_uuid: profile.sub,
      email: profile.email,
      first_name: profile.given_name || "",
      last_name: profile.family_name || "",
      sso: true,
    }),
  });
  const payload = await readJson(res);
  const ssoToken = payload && payload.data && payload.data.sso_token;
  if (!res.ok || payload.code !== "OK" || !ssoToken) {
    throw new Error(`MOI internal login failed: ${res.status}`);
  }
  return ssoToken;
}

function buildMoiBridgeUrl(moiAppUrl, ssoToken, redirectUrl) {
  const bridge = new URL("/sso-bridge", ensureTrailingSlash(moiAppUrl));
  bridge.searchParams.set("token", ssoToken);

  const redirect = new URL(redirectUrl);
  if (redirect.origin === bridge.origin) {
    bridge.searchParams.set("redirect", `${redirect.pathname}${redirect.search}${redirect.hash}`);
  }
  return bridge.href;
}

function signStateCookie(payload, secret) {
  const encoded = base64url(JSON.stringify(payload));
  const signature = hmac(encoded, secret);
  return `${encoded}.${signature}`;
}

function verifyStateCookie(value, secret) {
  if (!value) return null;
  const parts = value.split(".");
  if (parts.length !== 2) return null;
  const [encoded, signature] = parts;
  if (!timingSafeEqual(signature, hmac(encoded, secret))) return null;
  try {
    return JSON.parse(Buffer.from(encoded, "base64url").toString("utf8"));
  } catch {
    return null;
  }
}

function readConfig(env) {
  return {
    cookieSecret: requireEnv(env, "AUTH_COOKIE_SECRET"),
    issuer: trimTrailingSlash(requireEnv(env, "CLOUDSIGMA_ISSUER")),
    clientId: requireEnv(env, "CLOUDSIGMA_CLIENT_ID"),
    clientSecret: requireEnv(env, "CLOUDSIGMA_CLIENT_SECRET"),
    moiAppUrl: ensureTrailingSlash(requireEnv(env, "OMNIFABRIC_MOI_APP_URL")),
    moiInternalToken: requireEnv(env, "MOI_INTERNAL_TOKEN"),
  };
}

function requireEnv(env, key) {
  const value = env[key] || process.env[key];
  if (!value) throw new Error(`missing required env ${key}`);
  return value;
}

function callbackUrl(url) {
  return `${url.origin}/auth/cloudsigma/callback`;
}

function sanitizeRedirectUrl(raw, fallback) {
  if (!raw) return ensureTrailingSlash(fallback);
  try {
    const parsed = new URL(raw);
    if (parsed.protocol !== "https:") return ensureTrailingSlash(fallback);
    return parsed.href;
  } catch {
    return ensureTrailingSlash(fallback);
  }
}

function readCookie(request, name) {
  const raw = request.headers.get("cookie") || "";
  for (const part of raw.split(";")) {
    const [cookieName, ...valueParts] = part.trim().split("=");
    if (cookieName === name) return valueParts.join("=");
  }
  return "";
}

async function readJson(res) {
  const text = await res.text();
  if (!text) return {};
  return JSON.parse(text);
}

function redirectResponse(location, headers = {}) {
  return new Response(null, {
    status: 302,
    headers: { location, ...headers },
  });
}

function textResponse(text, status) {
  return new Response(text, {
    status,
    headers: { "content-type": "text/plain; charset=utf-8" },
  });
}

function randomToken() {
  return crypto.randomBytes(24).toString("base64url");
}

function hmac(value, secret) {
  return crypto.createHmac("sha256", secret).update(value).digest("base64url");
}

function base64url(value) {
  return Buffer.from(value).toString("base64url");
}

function timingSafeEqual(a, b) {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && crypto.timingSafeEqual(left, right);
}

function trimTrailingSlash(value) {
  return value.replace(/\/+$/, "");
}

function ensureTrailingSlash(value) {
  return `${trimTrailingSlash(value)}/`;
}

module.exports = {
  buildMoiBridgeUrl,
  handleRequest,
  signStateCookie,
  verifyStateCookie,
};
