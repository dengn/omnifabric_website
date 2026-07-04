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

test("create account legal links point to implemented pages", () => {
  const html = fs.readFileSync("auth.html", "utf8");
  const i18n = fs.readFileSync("assets/js/i18n.js", "utf8");

  assert.match(html, /<a href="privacy\.html">Privacy Policy<\/a>/);
  assert.match(html, /<a href="terms\.html">Terms of Service<\/a>/);
  assert.doesNotMatch(i18n, /au\.terms": "[^"]*href=\\"#\\"/);
  assert.match(i18n, /href=\\"privacy\.html\\"/);
  assert.match(i18n, /href=\\"terms\.html\\"/);
});

test("legal pages exist with document titles", () => {
  for (const page of ["privacy.html", "terms.html"]) {
    const html = fs.readFileSync(page, "utf8");
    assert.match(html, /<title>.+OmniFabric<\/title>/, `${page} should have an OmniFabric title`);
  }
});

test("nav Start building links use auth.js CTA wiring", () => {
  for (const page of pages) {
    const html = fs.readFileSync(page, "utf8");
    assert.match(
      html,
      /<a href="#" class="btn btn-primary" data-auth-action="register"><span data-i18n="nav\.cta">Start building<\/span>/,
      `${page} nav Start building should register through CloudSigma broker`,
    );
  }
});

test("homepage hero Start building free uses auth.js CTA wiring", () => {
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
