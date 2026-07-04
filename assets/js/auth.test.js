const assert = require("node:assert/strict");
const { test } = require("node:test");

const {
  buildAuthUrl,
  resolveAuthConfig,
} = require("./auth.js");

test("resolveAuthConfig provides production defaults for broker and MOI app", function () {
  const config = resolveAuthConfig({});

  assert.equal(config.loginUrl, "/auth/cloudsigma/login");
  assert.equal(config.registerUrl, "/auth/cloudsigma/register");
  assert.equal(config.moiAppUrl, "https://genai.next.cloudsigma.com/");
});

test("buildAuthUrl preserves broker query string and appends redirect target", function () {
  const url = buildAuthUrl("/auth/cloudsigma/login?plan=team", "https://genai.next.cloudsigma.com/");

  assert.equal(
    url,
    "/auth/cloudsigma/login?plan=team&redirect=https%3A%2F%2Fgenai.next.cloudsigma.com%2F",
  );
});

test("buildAuthUrl preserves absolute broker origin", function () {
  const url = buildAuthUrl("https://accounts.next.cloudsigma.com/auth/cloudsigma/login", "https://genai.next.cloudsigma.com/");

  assert.equal(
    url,
    "https://accounts.next.cloudsigma.com/auth/cloudsigma/login?redirect=https%3A%2F%2Fgenai.next.cloudsigma.com%2F",
  );
});

test("buildAuthUrl leaves direct MOI app entrypoint unchanged", function () {
  const url = buildAuthUrl("https://genai.next.cloudsigma.com", "https://genai.next.cloudsigma.com/");

  assert.equal(url, "https://genai.next.cloudsigma.com");
});
