(() => {
  "use strict";

  const overlay = document.querySelector("[data-intro-overlay]");
  const skipButton = document.querySelector("[data-intro-skip]");
  const heroTitle = document.querySelector(".hero-title");
  const introStorageKey = "perfect-mens-wear-intro-v1";

  if (!overlay) return;

  const timers = new Set();
  let isFinished = false;
  let keyboardHandler;

  function schedule(callback, delay) {
    const timer = window.setTimeout(() => {
      timers.delete(timer);
      callback();
    }, delay);
    timers.add(timer);
    return timer;
  }

  function removeOverlay() {
    overlay.remove();
  }

  function revealHero() {
    if (!heroTitle) return;
    heroTitle.classList.remove("is-intro-pending");
    heroTitle.classList.add("is-revealed");
  }

  function ensureHeroLineMasks() {
    if (!heroTitle || heroTitle.querySelector(".hero-title-line")) return;

    const text = heroTitle.textContent.trim().replace(/\s+/g, " ");
    if (!text) return;

    const words = text.split(" ");
    let splitAt = words.length;
    if (words.length > 3) {
      const totalLength = words.join(" ").length;
      let bestDistance = totalLength;
      let currentLength = 0;
      for (let index = 1; index < words.length; index += 1) {
        currentLength += words[index - 1].length + (index > 1 ? 1 : 0);
        const distance = Math.abs(totalLength / 2 - currentLength);
        if (distance < bestDistance) {
          bestDistance = distance;
          splitAt = index;
        }
      }
    }

    const lines = [words.slice(0, splitAt).join(" "), words.slice(splitAt).join(" ")].filter(Boolean);
    heroTitle.replaceChildren(...lines.map((line) => {
      const mask = document.createElement("span");
      const textLine = document.createElement("span");
      mask.className = "hero-title-line";
      textLine.textContent = line;
      mask.append(textLine);
      return mask;
    }));
  }

  function removeKeyboardHandler() {
    if (!keyboardHandler) return;
    document.removeEventListener("keydown", keyboardHandler);
    keyboardHandler = undefined;
  }

  function finishIntro(skipped = false) {
    if (isFinished) return;
    isFinished = true;
    timers.forEach((timer) => window.clearTimeout(timer));
    timers.clear();
    removeKeyboardHandler();

    overlay.classList.add("is-opening");
    if (skipped) overlay.classList.add("is-skipped");
    revealHero();

    if (skipped) {
      schedule(removeOverlay, 240);
      return;
    }

    removeOverlay();
  }

  function handleIntroKeydown(event) {
    if (event.ctrlKey || event.metaKey || event.altKey) return;

    if (event.key === "Tab") {
      finishIntro(true);
      return;
    }

    if (event.key === "Escape" || event.key === "Enter" || event.key === " " || event.key.length === 1) {
      if (event.key === "Escape" || event.key === "Enter" || event.key === " ") event.preventDefault();
      finishIntro(true);
    }
  }

  function initialize() {
    if (heroTitle) {
      new MutationObserver(ensureHeroLineMasks).observe(heroTitle, { childList: true });
    }

    let wasShown = false;
    try {
      wasShown = window.sessionStorage.getItem(introStorageKey) === "shown";
    } catch (_error) {
      // Storage may be unavailable in private browsing; the intro still works for this page view.
    }

    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (wasShown || prefersReducedMotion) {
      removeOverlay();
      return;
    }

    try {
      window.sessionStorage.setItem(introStorageKey, "shown");
    } catch (_error) {
      // Continue with the reveal if session storage is unavailable.
    }

    overlay.hidden = false;
    overlay.classList.add("is-playing");
    heroTitle?.classList.add("is-intro-pending");
    skipButton?.focus({ preventScroll: true });

    keyboardHandler = handleIntroKeydown;
    document.addEventListener("keydown", keyboardHandler);
    overlay.addEventListener("click", () => finishIntro(true), { once: true });

    schedule(() => {
      overlay.classList.add("is-opening");
      removeKeyboardHandler();
    }, 1400);

    schedule(revealHero, 2200);
    schedule(() => {
      isFinished = true;
      removeKeyboardHandler();
      removeOverlay();
    }, 2880);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initialize, { once: true });
  } else {
    initialize();
  }
})();
