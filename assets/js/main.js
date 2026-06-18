/* OmniFabric — interactions: sticky header, mobile nav, scroll reveal */
(function () {
  "use strict";

  if (window.OmniFabricAuth) {
    window.OmniFabricAuth.wireAuthLinks(window);
  }

  // Sticky header shadow on scroll
  var header = document.getElementById("header");
  var onScroll = function () {
    if (window.scrollY > 8) header.classList.add("scrolled");
    else header.classList.remove("scrolled");
  };
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  // Mobile nav toggle
  var nav = document.getElementById("nav");
  var toggle = document.getElementById("navToggle");
  if (toggle) {
    toggle.addEventListener("click", function () {
      nav.classList.toggle("open");
    });
    nav.querySelectorAll(".nav-links a").forEach(function (a) {
      a.addEventListener("click", function () { nav.classList.remove("open"); });
    });
  }

  // Scroll reveal
  var reveals = document.querySelectorAll(".reveal");
  if ("IntersectionObserver" in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e, i) {
        if (e.isIntersecting) {
          // small stagger for grouped items
          var delay = (e.target.dataset.delay || 0);
          setTimeout(function () { e.target.classList.add("in"); }, delay);
          io.unobserve(e.target);
        }
      });
    }, { threshold: 0.12, rootMargin: "0px 0px -40px 0px" });

    reveals.forEach(function (el, i) { io.observe(el); });
  } else {
    reveals.forEach(function (el) { el.classList.add("in"); });
  }

  // FAQ accordion
  document.querySelectorAll(".faq-item").forEach(function (item) {
    var q = item.querySelector(".faq-q");
    var a = item.querySelector(".faq-a");
    if (!q || !a) return;
    q.addEventListener("click", function () {
      var isOpen = item.classList.contains("open");
      // close siblings for a clean single-open accordion
      item.parentElement.querySelectorAll(".faq-item.open").forEach(function (other) {
        if (other !== item) { other.classList.remove("open"); other.querySelector(".faq-a").style.maxHeight = null; }
      });
      if (isOpen) { item.classList.remove("open"); a.style.maxHeight = null; }
      else { item.classList.add("open"); a.style.maxHeight = a.scrollHeight + "px"; }
    });
  });

  // Stagger items that share a parent grid
  document.querySelectorAll(".pillars-grid, .outcomes-grid, .sol-grid, .steps, .stats-grid")
    .forEach(function (grid) {
      Array.prototype.forEach.call(grid.children, function (child, i) {
        if (child.classList.contains("reveal")) child.dataset.delay = i * 80;
      });
    });
})();
