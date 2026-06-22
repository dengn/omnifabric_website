const assert = require("node:assert/strict");
const fs = require("node:fs");
const { test } = require("node:test");
const { parseEnvLine } = require("./env-loader");

const requiredEnvKeys = [
  "AUTH_COOKIE_SECRET",
  "CLOUDSIGMA_ISSUER",
  "CLOUDSIGMA_CLIENT_ID",
  "CLOUDSIGMA_CLIENT_SECRET",
  "OMNIFABRIC_MOI_APP_URL",
  "MOI_INTERNAL_TOKEN",
  "PORT",
];

test("production broker env example declares every runtime key", () => {
  const content = fs.readFileSync("deploy/cloudsigma-broker.env.example", "utf8");
  const keys = new Set(
    content
      .split(/\r?\n/)
      .map(parseEnvLine)
      .filter(Boolean)
      .map(([key]) => key),
  );

  for (const key of requiredEnvKeys) {
    assert.equal(keys.has(key), true, `${key} missing from deploy/cloudsigma-broker.env.example`);
  }
});

test("systemd unit uses the production env file and node broker entrypoint", () => {
  const content = fs.readFileSync("deploy/omnifabric-cloudsigma-broker.service", "utf8");

  assert.match(content, /^EnvironmentFile=\/etc\/omnifabric\/cloudsigma-broker\.env$/m);
  assert.match(content, /^ExecStart=\/usr\/bin\/node \/var\/www\/omnifabric\/server\/node-server\.js$/m);
  assert.match(content, /^User=www-data$/m);
});

test("nginx broker location proxies only CloudSigma auth paths", () => {
  const content = fs.readFileSync("deploy/nginx-cloudsigma-broker-location.conf", "utf8");

  assert.match(content, /location \^~ \/auth\/cloudsigma\//);
  assert.match(content, /proxy_pass http:\/\/127\.0\.0\.1:8787;/);
  assert.match(content, /proxy_set_header X-Forwarded-Proto \$scheme;/);
});
