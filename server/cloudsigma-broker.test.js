const assert = require("node:assert/strict");
const { test } = require("node:test");

const {
  handleRequest,
  signStateCookie,
} = require("./cloudsigma-broker.js");

const baseEnv = {
  AUTH_COOKIE_SECRET: "test-cookie-secret",
  CLOUDSIGMA_ISSUER: "https://oauth-stg.cloudsigma.com/realms/cloudsigma",
  CLOUDSIGMA_CLIENT_ID: "cloudsigma",
  CLOUDSIGMA_CLIENT_SECRET: "client-secret",
  OMNIFABRIC_MOI_APP_URL: "https://genai.next.cloudsigma.com/",
  MOI_INTERNAL_TOKEN: "internal-token",
};

test("login endpoint redirects to CloudSigma authorization endpoint and sets signed state cookie", async () => {
  const req = new Request("https://next.cloudsigma.com/auth/cloudsigma/login?redirect=https%3A%2F%2Fgenai.next.cloudsigma.com%2F");

  const res = await handleRequest(req, baseEnv);

  assert.equal(res.status, 302);
  const location = new URL(res.headers.get("location"));
  assert.equal(location.href.startsWith("https://oauth-stg.cloudsigma.com/realms/cloudsigma/protocol/openid-connect/auth?"), true);
  assert.equal(location.searchParams.get("client_id"), "cloudsigma");
  assert.equal(location.searchParams.get("response_type"), "code");
  assert.equal(location.searchParams.get("redirect_uri"), "https://next.cloudsigma.com/auth/cloudsigma/callback");
  assert.ok(location.searchParams.get("state"));
  assert.match(res.headers.get("set-cookie"), /of_auth_state=/);
});

test("register endpoint redirects to Keycloak registration endpoint", async () => {
  const req = new Request("https://next.cloudsigma.com/auth/cloudsigma/register");

  const res = await handleRequest(req, baseEnv);

  assert.equal(res.status, 302);
  const location = new URL(res.headers.get("location"));
  assert.equal(location.pathname, "/realms/cloudsigma/protocol/openid-connect/registrations");
});

test("callback exchanges CloudSigma code, calls MOI internal login, and redirects to MOI sso bridge", async () => {
  const stateCookie = signStateCookie(
    {
      state: "state-1",
      nonce: "nonce-1",
      redirectUrl: "https://genai.next.cloudsigma.com/workspace/1?tab=jobs",
      issuedAt: Date.now(),
      mode: "login",
    },
    baseEnv.AUTH_COOKIE_SECRET,
  );
  const calls = [];
  const fetchImpl = async (url, init = {}) => {
    calls.push({ url: String(url), init });
    if (String(url).endsWith("/protocol/openid-connect/token")) {
      return jsonResponse({ access_token: "cloudsigma-access-token" });
    }
    if (String(url).endsWith("/protocol/openid-connect/userinfo")) {
      return jsonResponse({
        sub: "cs-user-1",
        email: "user@example.com",
        email_verified: true,
        given_name: "Ada",
        family_name: "Lovelace",
      });
    }
    if (String(url) === "https://genai.next.cloudsigma.com/newmoi/internal/cloudsigma/login") {
      assert.equal(init.headers["X-MOI-Internal-Token"], "internal-token");
      assert.deepEqual(JSON.parse(init.body), {
        cloudsigma_uuid: "cs-user-1",
        email: "user@example.com",
        first_name: "Ada",
        last_name: "Lovelace",
        sso: true,
      });
      return jsonResponse({ code: "OK", data: { sso_token: "moi-sso-token" } });
    }
    throw new Error(`unexpected fetch ${url}`);
  };
  const req = new Request("https://next.cloudsigma.com/auth/cloudsigma/callback?code=code-1&state=state-1", {
    headers: { cookie: `of_auth_state=${stateCookie}` },
  });

  const res = await handleRequest(req, baseEnv, { fetch: fetchImpl });

  assert.equal(res.status, 302);
  const location = new URL(res.headers.get("location"));
  assert.equal(location.origin, "https://genai.next.cloudsigma.com");
  assert.equal(location.pathname, "/sso-bridge");
  assert.equal(location.searchParams.get("token"), "moi-sso-token");
  assert.equal(location.searchParams.get("redirect"), "/workspace/1?tab=jobs");
  assert.equal(calls.length, 3);
});

function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}
