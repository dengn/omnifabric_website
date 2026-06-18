const assert = require("node:assert/strict");
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

async function waitFor(predicate) {
  const deadline = Date.now() + 2000;
  while (Date.now() < deadline) {
    if (predicate()) return;
    await new Promise((resolve) => setTimeout(resolve, 20));
  }
  throw new Error("timed out waiting for test server");
}
