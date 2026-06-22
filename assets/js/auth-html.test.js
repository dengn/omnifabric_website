const assert = require("node:assert/strict");
const fs = require("node:fs");
const { test } = require("node:test");

const pages = [
  "about.html",
  "customers.html",
  "demo.html",
  "docs.html",
  "index.html",
  "pricing.html",
  "product.html",
  "regions.html",
  "solutions.html",
];

test("nav Start building links use the CloudSigma register broker", () => {
  for (const page of pages) {
    const html = fs.readFileSync(page, "utf8");
    assert.match(
      html,
      /<a href="#" class="btn btn-primary" data-auth-action="register"><span data-i18n="nav\.cta">Start building<\/span>/,
      `${page} nav Start building should register through CloudSigma broker`,
    );
  }
});

test("homepage hero Start building free uses the CloudSigma register broker", () => {
  const html = fs.readFileSync("index.html", "utf8");
  assert.match(
    html,
    /<a href="#" class="btn btn-primary btn-lg" data-auth-action="register"><span data-i18n="hero\.cta1">Start building free<\/span>/,
  );
});

test("public pages load broker auth script and do not link the legacy auth page", () => {
  for (const page of pages) {
    const html = fs.readFileSync(page, "utf8");
    assert.doesNotMatch(html, /auth\.html/, `${page} should not link the legacy auth page`);
    assert.match(html, /<script src="assets\/js\/auth\.js"><\/script>/, `${page} should load auth.js`);
  }
});
