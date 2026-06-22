const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { test } = require("node:test");
const { loadEnvFiles, parseEnvLine } = require("./env-loader");

test("loadEnvFiles loads .env and lets .env.local fill missing values", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "omnifabric-env-"));
  fs.writeFileSync(
    path.join(dir, ".env"),
    [
      "CLOUDSIGMA_CLIENT_ID=cloudsigma",
      "MOI_INTERNAL_TOKEN=from-env",
      "",
    ].join("\n"),
  );
  fs.writeFileSync(
    path.join(dir, ".env.local"),
    [
      "MOI_INTERNAL_TOKEN=from-local",
      "AUTH_COOKIE_SECRET=local-secret",
      "",
    ].join("\n"),
  );

  const env = {};
  loadEnvFiles(dir, env);

  assert.equal(env.CLOUDSIGMA_CLIENT_ID, "cloudsigma");
  assert.equal(env.MOI_INTERNAL_TOKEN, "from-env");
  assert.equal(env.AUTH_COOKIE_SECRET, "local-secret");
});

test("loadEnvFiles does not override process-provided env", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "omnifabric-env-"));
  fs.writeFileSync(path.join(dir, ".env.local"), "MOI_INTERNAL_TOKEN=from-file\n");

  const env = { MOI_INTERNAL_TOKEN: "from-runtime" };
  loadEnvFiles(dir, env);

  assert.equal(env.MOI_INTERNAL_TOKEN, "from-runtime");
});

test("parseEnvLine supports comments and quoted values", () => {
  assert.equal(parseEnvLine("# comment"), null);
  assert.deepEqual(parseEnvLine('AUTH_COOKIE_SECRET="line\\nvalue"'), ["AUTH_COOKIE_SECRET", "line\nvalue"]);
  assert.deepEqual(parseEnvLine("MOI_INTERNAL_TOKEN='token=value'"), ["MOI_INTERNAL_TOKEN", "token=value"]);
});
