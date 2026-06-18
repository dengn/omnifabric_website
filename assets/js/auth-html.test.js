const assert = require("node:assert/strict");
const fs = require("node:fs");
const { test } = require("node:test");

const pages = [
  "about.html",
  "customers.html",
  "docs.html",
  "index.html",
  "pricing.html",
  "regions.html",
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
