(() => {
  "use strict";

  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const internalPages = new Set(["/", "/index.html", "/collection.html", "/contact.html"]);

  function addReveal(element, delay = 0, observer) {
    if (!element || element.dataset.scrollReveal) return;
    element.dataset.scrollReveal = "pending";
    element.style.setProperty("--reveal-delay", `${delay}ms`);
    observer?.observe(element);
  }

  function maskHeading(heading, observer) {
    if (heading.dataset.motionHeadingMasked || !heading.textContent.trim()) return;

    const lines = [[]];
    [...heading.childNodes].forEach((node) => {
      if (node.nodeType === Node.ELEMENT_NODE && node.tagName === "BR" && !node.classList.contains("mobile-only")) {
        lines.push([]);
      } else {
        lines[lines.length - 1].push(node);
      }
    });

    heading.replaceChildren(...lines.filter((line) => line.length).map((line, index) => {
      const mask = document.createElement("span");
      const content = document.createElement("span");
      mask.className = "motion-heading-line";
      content.className = "motion-heading-content";
      content.style.setProperty("--heading-line-delay", `${index * 90}ms`);
      line.forEach((node) => content.append(node));
      mask.append(content);
      return mask;
    }));

    heading.dataset.motionHeadingMasked = "true";
    addReveal(heading, 0, observer);
  }

  function setStagger(container, observer) {
    const staggerable = [...container.children].filter((child) =>
      child.matches(".category-card, .product-card, .step")
    );
    staggerable.forEach((child, index) => addReveal(child, Math.min(index * 75, 375), observer));
  }

  function setupScrollReveals(main) {
    if (reducedMotion.matches || !main || !("IntersectionObserver" in window)) return;

    let revealObserver;
    revealObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        const target = entry.target;
        target.dataset.scrollReveal = "visible";
        revealObserver.unobserve(target);
      });
    }, { threshold: 0.12, rootMargin: "0px 0px -6% 0px" });

    const revealSelector = ".category-card, .product-card, .step, .heritage-copy, .story-copy, .store-visit-copy, .contact-copy, .contact-card, .contact-form-layout > *, .closing-section .centered";
    const staggerSelector = ".category-grid, .product-grid, .steps-grid";
    const prepare = (root) => {
      if (!(root instanceof Element)) return;
      const headings = root.matches("h2") ? [root] : [...root.querySelectorAll("h2")];
      headings.forEach((heading) => maskHeading(heading, revealObserver));

      const revealTargets = root.matches(revealSelector) ? [root] : [...root.querySelectorAll(revealSelector)];
      revealTargets.forEach((element) => addReveal(element, 0, revealObserver));

      const staggerContainers = root.matches(staggerSelector) ? [root] : [...root.querySelectorAll(staggerSelector)];
      staggerContainers.forEach((container) => setStagger(container, revealObserver));

      const parentContainer = root.closest?.(staggerSelector);
      if (parentContainer) setStagger(parentContainer, revealObserver);
    };

    prepare(main);
    document.body.classList.add("motion-ready", "motion-initializing");
    requestAnimationFrame(() => document.body.classList.remove("motion-initializing"));

    const contentObserver = new MutationObserver((records) => {
      records.forEach((record) => record.addedNodes.forEach(prepare));
    });
    contentObserver.observe(main, { childList: true, subtree: true });
  }

  function localizeNumber(value) {
    const locale = document.documentElement.lang === "mr" ? "mr-IN" : "en-IN";
    return new Intl.NumberFormat(locale, { useGrouping: false, maximumFractionDigits: 0 }).format(value);
  }

  function runCountUp(element) {
    if (reducedMotion.matches || element.dataset.countStarted) return;
    const textNode = [...element.childNodes].find((node) => node.nodeType === Node.TEXT_NODE);
    if (!textNode) return;

    const originalText = textNode.nodeValue;
    const match = originalText.match(/[0-9०-९]+/);
    if (!match) return;

    const target = Number(match[0].replace(/[०-९]/g, (digit) => String(digit.charCodeAt(0) - 0x0966)));
    if (!Number.isFinite(target) || target <= 0) return;

    element.dataset.countStarted = "true";
    const before = originalText.slice(0, match.index);
    const after = originalText.slice(match.index + match[0].length);
    const startTime = performance.now();
    const duration = 1050;
    let lastRenderedText = originalText;

    function tick(now) {
      if (textNode.nodeValue !== lastRenderedText) return;
      if (reducedMotion.matches) {
        textNode.nodeValue = originalText;
        return;
      }
      const progress = Math.min((now - startTime) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      lastRenderedText = `${before}${localizeNumber(Math.round(target * eased))}${after}`;
      textNode.nodeValue = lastRenderedText;
      if (progress < 1) {
        requestAnimationFrame(tick);
      } else {
        if (textNode.nodeValue === lastRenderedText) textNode.nodeValue = originalText;
      }
    }

    requestAnimationFrame(tick);
  }

  function setupCounters() {
    if (reducedMotion.matches || !("IntersectionObserver" in window)) return;
    const counters = document.querySelectorAll(".since-badge strong, .since-label, .footer-since");
    if (!counters.length) return;

    const counterObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        runCountUp(entry.target);
        counterObserver.unobserve(entry.target);
      });
    }, { threshold: 0.6 });
    counters.forEach((counter) => counterObserver.observe(counter));
  }

  function setupHeader(header, heroMotionRequest) {
    if (!header) return;
    const navigation = header.querySelector(".primary-nav");
    let lastScrollY = window.scrollY;
    let frame = 0;

    const update = () => {
      frame = 0;
      const currentScrollY = Math.max(0, window.scrollY);
      const scrollingDown = currentScrollY > lastScrollY + 3;
      const scrollingUp = currentScrollY < lastScrollY - 3;
      const menuOpen = navigation?.classList.contains("is-open");

      header.classList.toggle("is-scrolled", currentScrollY > 24);
      if (currentScrollY <= 24) {
        header.classList.remove("is-hidden");
      } else if (!reducedMotion.matches && scrollingDown && currentScrollY > 100 && !menuOpen && !header.contains(document.activeElement)) {
        header.classList.add("is-hidden");
      } else if (scrollingUp) {
        header.classList.remove("is-hidden");
      }

      if (currentScrollY <= 24 || scrollingDown || scrollingUp) lastScrollY = currentScrollY;
      heroMotionRequest?.();
    };

    const onScroll = () => {
      if (frame) return;
      frame = requestAnimationFrame(update);
    };

    update();
    window.addEventListener("scroll", onScroll, { passive: true });
  }

  function setupHeroMotion(hero, heroImage) {
    if (reducedMotion.matches || !hero || !heroImage) return undefined;

    const startTime = performance.now();
    const settleDuration = 1350;
    let frame = 0;

    const render = (now) => {
      frame = 0;
      const progress = Math.min((now - startTime) / settleDuration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      const scale = 1.055 - (.055 * eased);
      const parallax = Math.min(window.scrollY, hero.offsetHeight) * .04;
      heroImage.style.transform = `translate3d(0, ${-parallax.toFixed(2)}px, 0) scale(${scale.toFixed(4)})`;
      if (progress < 1) frame = requestAnimationFrame(render);
    };

    const requestRender = () => {
      if (!frame) frame = requestAnimationFrame(render);
    };

    requestRender();
    return requestRender;
  }

  function setupMarquee() {
    if (reducedMotion.matches) return;
    const marquee = document.querySelector("[data-brand-marquee]");
    const track = marquee?.querySelector(".brand-marquee-track");
    const group = track?.querySelector(".brand-list");
    if (!marquee || !track || !group || track.children.length > 1) return;

    const copy = group.cloneNode(true);
    copy.classList.add("brand-list-copy");
    copy.removeAttribute("aria-label");
    copy.setAttribute("aria-hidden", "true");
    track.append(copy);
    track.classList.add("is-running");
    marquee.classList.add("is-running");
  }

  function setupPageTransitions() {
    const transition = document.createElement("div");
    transition.className = "page-transition";
    transition.setAttribute("aria-hidden", "true");
    document.body.append(transition);

    try {
      if (window.sessionStorage.getItem("perfect-mens-wear-page-transition-v1") === "pending") {
        window.sessionStorage.removeItem("perfect-mens-wear-page-transition-v1");
        document.body.classList.add("page-arriving");
        requestAnimationFrame(() => requestAnimationFrame(() => {
          document.body.classList.add("page-arrival-ready");
          window.setTimeout(() => document.body.classList.remove("page-arriving", "page-arrival-ready"), 380);
        }));
      }
    } catch (_error) {}

    let navigating = false;
    document.addEventListener("click", (event) => {
      if (reducedMotion.matches || navigating || event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const link = event.target.closest("a[href]");
      if (!link || link.target || link.hasAttribute("download") || link.closest("[data-no-transition]")) return;

      let destination;
      try {
        destination = new URL(link.href, window.location.href);
      } catch (_error) {
        return;
      }
      if (destination.origin !== window.location.origin || !internalPages.has(destination.pathname)) return;
      if (destination.pathname === window.location.pathname && destination.search === window.location.search) return;

      event.preventDefault();
      navigating = true;
      try {
        window.sessionStorage.setItem("perfect-mens-wear-page-transition-v1", "pending");
      } catch (_error) {}
      transition.classList.add("is-active");
      window.setTimeout(() => window.location.assign(destination.href), 190);
    });
  }

  function setupDesktopPointerEffects() {
    const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)");
    if (reducedMotion.matches || !finePointer.matches) return;

    const cursor = document.createElement("span");
    cursor.className = "luxury-cursor";
    cursor.setAttribute("aria-hidden", "true");
    document.body.append(cursor);
    document.body.classList.add("has-custom-cursor");

    let pointerFrame = 0;
    let pointerX = 0;
    let pointerY = 0;
    document.addEventListener("pointermove", (event) => {
      if (event.pointerType === "touch") return;
      pointerX = event.clientX;
      pointerY = event.clientY;
      if (pointerFrame) return;
      pointerFrame = requestAnimationFrame(() => {
        pointerFrame = 0;
        cursor.style.setProperty("--cursor-x", `${pointerX}px`);
        cursor.style.setProperty("--cursor-y", `${pointerY}px`);
        cursor.classList.add("is-visible");
      });
    }, { passive: true });

    document.addEventListener("pointerover", (event) => {
      if (event.pointerType === "touch") return;
      if (event.target.closest("a, button, .product-card")) cursor.classList.add("is-hovering");
    });
    document.addEventListener("pointerout", (event) => {
      if (event.pointerType === "touch") return;
      if (event.target.closest("a, button, .product-card") && !event.relatedTarget?.closest?.("a, button, .product-card")) {
        cursor.classList.remove("is-hovering");
      }
    });
    document.addEventListener("pointerleave", () => cursor.classList.remove("is-visible"));
    document.addEventListener("pointerenter", () => cursor.classList.add("is-visible"));

    document.querySelectorAll(".hero-actions .button, .page-hero .button, .closing-section .button").forEach((button) => {
      button.classList.add("magnetic-cta");
      let buttonFrame = 0;
      let x = 0;
      let y = 0;

      button.addEventListener("pointermove", (event) => {
        x = event.clientX;
        y = event.clientY;
        if (buttonFrame) return;
        buttonFrame = requestAnimationFrame(() => {
          buttonFrame = 0;
          const bounds = button.getBoundingClientRect();
          const offsetX = Math.max(-8, Math.min(8, (x - bounds.left - bounds.width / 2) * .12));
          const offsetY = Math.max(-6, Math.min(6, (y - bounds.top - bounds.height / 2) * .12));
          button.style.transform = `translate3d(${offsetX.toFixed(1)}px, ${offsetY.toFixed(1)}px, 0)`;
        });
      });
      button.addEventListener("pointerleave", () => button.style.removeProperty("transform"));
    });
  }

  function initialize() {
    const main = document.querySelector("main");
    const hero = document.querySelector(".hero");
    const heroImage = hero?.querySelector(".hero-image");
    const heroMotionRequest = setupHeroMotion(hero, heroImage);

    setupScrollReveals(main);
    setupCounters();
    setupHeader(document.querySelector(".site-header"), heroMotionRequest);
    setupMarquee();
    if (!reducedMotion.matches) {
      setupPageTransitions();
      setupDesktopPointerEffects();
    }
  }

  if (document.readyState === "loading" || document.readyState === "interactive") {
    document.addEventListener("DOMContentLoaded", initialize, { once: true });
  } else {
    initialize();
  }
})();
