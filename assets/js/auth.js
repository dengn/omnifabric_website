/* OmniFabric — CloudSigma SSO broker entrypoints */
(function (root, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory();
    return;
  }

  root.OmniFabricAuth = factory();
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  var DEFAULTS = {
    loginUrl: "/auth/cloudsigma/login",
    registerUrl: "/auth/cloudsigma/register",
    moiAppUrl: "https://genai.next.cloudsigma.com/",
  };

  function normalizeConfig(rawConfig) {
    rawConfig = rawConfig || {};
    return {
      loginUrl: rawConfig.loginUrl || DEFAULTS.loginUrl,
      registerUrl: rawConfig.registerUrl || DEFAULTS.registerUrl,
      moiAppUrl: rawConfig.moiAppUrl || DEFAULTS.moiAppUrl,
    };
  }

  function resolveAuthConfig(root) {
    root = root || {};
    return normalizeConfig(root.OMNIFABRIC_AUTH_CONFIG);
  }

  function buildAuthUrl(entryUrl, redirectUrl) {
    var isAbsolute = /^https?:\/\//i.test(entryUrl);
    var url = new URL(entryUrl, "https://omnifabric.local");
    var redirect = new URL(redirectUrl, "https://omnifabric.local");
    if (
      url.origin === redirect.origin &&
      url.pathname.replace(/\/$/, "") === redirect.pathname.replace(/\/$/, "") &&
      !url.search &&
      !url.hash
    ) {
      return entryUrl;
    }
    url.searchParams.set("redirect", redirectUrl);
    if (isAbsolute) {
      return url.href;
    }
    return url.pathname + url.search + url.hash;
  }

  function wireAuthLinks(root) {
    root = root || window;
    var documentRef = root.document;
    if (!documentRef) return;

    var config = resolveAuthConfig(root);
    documentRef.querySelectorAll("[data-auth-action]").forEach(function (link) {
      var action = link.getAttribute("data-auth-action");
      var entryUrl = action === "register" ? config.registerUrl : config.loginUrl;
      link.setAttribute("href", buildAuthUrl(entryUrl, config.moiAppUrl));
    });
  }

  return {
    buildAuthUrl: buildAuthUrl,
    resolveAuthConfig: resolveAuthConfig,
    wireAuthLinks: wireAuthLinks,
  };
});
