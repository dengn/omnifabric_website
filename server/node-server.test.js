const assert = require("node:assert/strict");
const http = require("node:http");
const { spawn } = require("node:child_process");
const { once } = require("node:events");
const { test } = require("node:test");

test("node adapter returns a generic 500 body when broker config is invalid", async () => {
  const port = String(19000 + Math.floor(Math.random() * 1000));
  const child = spawn(process.execPath, ["server/node-server.js"], {
    cwd: process.cwd(),
    env: {
      ...process.env,
      PORT: port,
      AUTH_COOKIE_SECRET: "",
      CLOUDSIGMA_ISSUER: "",
      CLOUDSIGMA_CLIENT_ID: "",
      CLOUDSIGMA_CLIENT_SECRET: "",
      OMNIFABRIC_MOI_APP_URL: "",
      MOI_INTERNAL_TOKEN: "",
    },
    stdio: ["ignore", "pipe", "pipe"],
  });

  let stdout = "";
  child.stdout.setEncoding("utf8");
  child.stdout.on("data", (chunk) => {
    stdout += chunk;
  });

  await waitFor(() => stdout.includes(`:${port}`));

  try {
    const res = await fetch(`http://127.0.0.1:${port}/auth/cloudsigma/login`);
    const body = await res.text();

    assert.equal(res.status, 500);
    assert.equal(body, "broker error");
    assert.doesNotMatch(body, /missing required env|AUTH_COOKIE_SECRET/);
  } finally {
    child.kill();
    await once(child, "exit");
  }
});

test("node adapter defaults production hosts to https when forwarded proto is absent", async () => {
  const port = String(20000 + Math.floor(Math.random() * 1000));
  const child = spawn(process.execPath, ["server/node-server.js"], {
    cwd: process.cwd(),
    env: {
      ...process.env,
      PORT: port,
      AUTH_COOKIE_SECRET: "test-cookie-secret",
      CLOUDSIGMA_ISSUER: "https://oauth-stg.cloudsigma.com/realms/cloudsigma",
      CLOUDSIGMA_CLIENT_ID: "cloudsigma",
      CLOUDSIGMA_CLIENT_SECRET: "client-secret",
      OMNIFABRIC_MOI_APP_URL: "https://genai.next.cloudsigma.com/",
      MOI_INTERNAL_TOKEN: "internal-token",
    },
    stdio: ["ignore", "pipe", "pipe"],
  });

  let stdout = "";
  child.stdout.setEncoding("utf8");
  child.stdout.on("data", (chunk) => {
    stdout += chunk;
  });

  await waitFor(() => stdout.includes(`:${port}`));

  try {
    const res = await nodeRequest({
      hostname: "127.0.0.1",
      port,
      path: "/auth/cloudsigma/login",
      headers: { host: "next.cloudsigma.com" },
    });
    const location = new URL(res.headers.location);

    assert.equal(res.statusCode, 302);
    assert.equal(location.searchParams.get("redirect_uri"), "https://next.cloudsigma.com/auth/cloudsigma/callback");
  } finally {
    child.kill();
    await once(child, "exit");
  }
});

test("node adapter uses the first forwarded proto value from proxy chains", async () => {
  const port = String(22000 + Math.floor(Math.random() * 1000));
  const child = spawn(process.execPath, ["server/node-server.js"], {
    cwd: process.cwd(),
    env: {
      ...process.env,
      PORT: port,
      AUTH_COOKIE_SECRET: "test-cookie-secret",
      CLOUDSIGMA_ISSUER: "https://oauth-stg.cloudsigma.com/realms/cloudsigma",
      CLOUDSIGMA_CLIENT_ID: "cloudsigma",
      CLOUDSIGMA_CLIENT_SECRET: "client-secret",
      OMNIFABRIC_MOI_APP_URL: "https://genai.next.cloudsigma.com/",
      MOI_INTERNAL_TOKEN: "internal-token",
    },
    stdio: ["ignore", "pipe", "pipe"],
  });

  let stdout = "";
  child.stdout.setEncoding("utf8");
  child.stdout.on("data", (chunk) => {
    stdout += chunk;
  });

  await waitFor(() => stdout.includes(`:${port}`));

  try {
    const res = await nodeRequest({
      hostname: "127.0.0.1",
      port,
      path: "/auth/cloudsigma/login",
      headers: {
        host: "next.cloudsigma.com",
        "x-forwarded-proto": "https,http",
      },
    });
    const location = new URL(res.headers.location);

    assert.equal(res.statusCode, 302);
    assert.equal(location.searchParams.get("redirect_uri"), "https://next.cloudsigma.com/auth/cloudsigma/callback");
  } finally {
    child.kill();
    await once(child, "exit");
  }
});

test("node adapter keeps localhost callbacks on http when forwarded proto is absent", async () => {
  const port = String(21000 + Math.floor(Math.random() * 1000));
  const child = spawn(process.execPath, ["server/node-server.js"], {
    cwd: process.cwd(),
    env: {
      ...process.env,
      PORT: port,
      AUTH_COOKIE_SECRET: "test-cookie-secret",
      CLOUDSIGMA_ISSUER: "https://oauth-stg.cloudsigma.com/realms/cloudsigma",
      CLOUDSIGMA_CLIENT_ID: "cloudsigma",
      CLOUDSIGMA_CLIENT_SECRET: "client-secret",
      OMNIFABRIC_MOI_APP_URL: "https://genai.next.cloudsigma.com/",
      MOI_INTERNAL_TOKEN: "internal-token",
    },
    stdio: ["ignore", "pipe", "pipe"],
  });

  let stdout = "";
  child.stdout.setEncoding("utf8");
  child.stdout.on("data", (chunk) => {
    stdout += chunk;
  });

  await waitFor(() => stdout.includes(`:${port}`));

  try {
    const res = await nodeRequest({
      hostname: "127.0.0.1",
      port,
      path: "/auth/cloudsigma/login",
      headers: { host: `localhost:${port}` },
    });
    const location = new URL(res.headers.location);

    assert.equal(res.statusCode, 302);
    assert.equal(location.searchParams.get("redirect_uri"), `http://localhost:${port}/auth/cloudsigma/callback`);
  } finally {
    child.kill();
    await once(child, "exit");
  }
});

async function waitFor(predicate) {
  const deadline = Date.now() + 2000;
  while (Date.now() < deadline) {
    if (predicate()) return;
    await new Promise((resolve) => setTimeout(resolve, 20));
  }
  throw new Error("timed out waiting for test server");
}

function nodeRequest(options) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      res.resume();
      res.on("end", () => resolve(res));
    });
    req.on("error", reject);
    req.end();
  });
}
