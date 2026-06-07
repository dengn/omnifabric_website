/* OmniFabric — region selection & provisioning (client-side simulation) */
(function () {
  "use strict";
  var overlay = document.getElementById("provModal");
  if (!overlay) return; // only on the regions page

  var KEY = "of_region";
  var modalRegion = overlay.querySelector("[data-modal-region]");
  var steps = overlay.querySelectorAll(".prov-step");
  var body = overlay.querySelector(".prov-body");
  var done = overlay.querySelector(".prov-done");
  var endpointEl = overlay.querySelector("[data-endpoint]");
  var banner = document.getElementById("regionBanner");
  var bannerVal = document.getElementById("rgActiveVal");
  var running = false;

  function t(k) { return window.ofT ? window.ofT(k) : k; }
  function getActive() { try { return JSON.parse(localStorage.getItem(KEY) || "null"); } catch (e) { return null; } }
  function saveActive(r) { try { localStorage.setItem(KEY, JSON.stringify(r)); } catch (e) {} }
  function cardData(c) { return { name: c.dataset.region, code: c.dataset.code, flag: c.dataset.flag, country: c.dataset.country }; }

  function refreshCards() {
    var act = getActive();
    document.querySelectorAll(".region").forEach(function (card) {
      if (card.dataset.status !== "available") return;
      var btn = card.querySelector(".region-activate");
      if (!btn) return;
      if (act && act.code === card.dataset.code) {
        card.classList.add("is-active");
        btn.setAttribute("data-i18n", "rg.btn.active");
        btn.textContent = t("rg.btn.active");
        btn.disabled = true;
      } else {
        card.classList.remove("is-active");
        btn.setAttribute("data-i18n", "rg.btn.activate");
        btn.textContent = t("rg.btn.activate");
        btn.disabled = false;
      }
    });
  }

  function refreshBanner() {
    var act = getActive();
    if (act) {
      banner.setAttribute("data-active", "true");
      bannerVal.textContent = act.flag + " " + act.name + ", " + act.country;
    } else {
      banner.setAttribute("data-active", "false");
      bannerVal.textContent = t("rg.active.none");
    }
  }

  // let the i18n layer re-render dynamic region text on language change
  window.ofRefreshRegions = function () { refreshBanner(); refreshCards(); };

  function resetModal() {
    steps.forEach(function (s) { s.classList.remove("active", "done"); });
    body.classList.remove("hide");
    done.classList.remove("show");
  }

  function runSteps() {
    running = true;
    var i = 0;
    (function next() {
      if (i > 0) { steps[i - 1].classList.remove("active"); steps[i - 1].classList.add("done"); }
      if (i < steps.length) { steps[i].classList.add("active"); i++; setTimeout(next, 850); }
      else { finish(); }
    })();
  }

  function finish() {
    var r = { name: overlay.dataset.name, code: overlay.dataset.code, flag: overlay.dataset.flag, country: overlay.dataset.country };
    endpointEl.textContent = "https://" + r.code + ".omnifabric.cloud";
    body.classList.add("hide");
    done.classList.add("show");
    saveActive(r);
    refreshBanner();
    refreshCards();
    running = false;
  }

  function openModal(card) {
    var d = cardData(card);
    overlay.dataset.code = d.code; overlay.dataset.name = d.name;
    overlay.dataset.country = d.country; overlay.dataset.flag = d.flag;
    modalRegion.querySelector(".flag").textContent = d.flag;
    modalRegion.querySelector("b").textContent = d.name;
    modalRegion.querySelector("span").textContent = d.country;
    resetModal();
    overlay.classList.add("open");
    runSteps();
  }

  function closeModal() { if (running) return; overlay.classList.remove("open"); }

  document.querySelectorAll(".region-activate").forEach(function (btn) {
    btn.addEventListener("click", function () {
      var card = btn.closest(".region");
      if (!card || card.dataset.status !== "available" || card.classList.contains("is-active")) return;
      openModal(card);
    });
  });
  document.querySelectorAll(".region-notify").forEach(function (btn) {
    btn.addEventListener("click", function () {
      btn.removeAttribute("data-i18n");
      btn.textContent = t("rg.btn.notified");
      btn.disabled = true;
    });
  });
  overlay.querySelectorAll("[data-close]").forEach(function (el) { el.addEventListener("click", closeModal); });
  overlay.addEventListener("click", function (e) { if (e.target === overlay) closeModal(); });
  document.addEventListener("keydown", function (e) { if (e.key === "Escape") closeModal(); });

  refreshBanner();
  refreshCards();
})();
