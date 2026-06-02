"use client";

import { useEffect } from "react";

const REVEAL_SELECTORS = [
  ".collection-back-link",
  ".collections-hero",
  ".collection-detail-hero",
  ".collections-stat-panel",
  ".collection-stat-panel",
  ".collection-section-topline",
  ".collection-card",
  ".collection-seo-box",
  ".collection-faq-card",
  ".collection-related-card",
].join(",");

function getRevealGroupKey(element: HTMLElement) {
  if (element.matches(".collections-hero, .collection-detail-hero")) {
    return "hero";
  }

  const section = element.closest<HTMLElement>(".collection-section");
  const title = section?.querySelector("h2")?.textContent?.trim();

  return title || "page";
}

function getRevealDelay(element: HTMLElement, indexInGroup: number) {
  const inlineAnimationDelay = element.style.animationDelay;

  if (inlineAnimationDelay) {
    element.style.animationDelay = "";
    return inlineAnimationDelay;
  }

  if (element.matches(".collections-hero, .collection-detail-hero")) {
    return "90ms";
  }

  if (element.matches(".collections-stat-panel, .collection-stat-panel")) {
    return "190ms";
  }

  if (element.matches(".collection-back-link, .collection-section-topline, .collection-seo-box")) {
    return "80ms";
  }

  return `${Math.min(120 + indexInGroup * 105, 920)}ms`;
}

export default function CollectionsRevealClient() {
  useEffect(() => {
    const root = document.querySelector<HTMLElement>(".kinoluma-collections");

    if (!root) {
      return;
    }

    const prefersReducedMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
    const elements = Array.from(root.querySelectorAll<HTMLElement>(REVEAL_SELECTORS));
    const groupIndexes = new Map<string, number>();
    let isDisposed = false;

    elements.forEach((element) => {
      const groupKey = getRevealGroupKey(element);
      const indexInGroup = groupIndexes.get(groupKey) ?? 0;

      groupIndexes.set(groupKey, indexInGroup + 1);
      element.classList.add("collection-reveal-item");
      element.style.setProperty("--collection-reveal-delay", getRevealDelay(element, indexInGroup));
    });

    const reveal = (element: Element) => {
      if (!isDisposed) {
        element.classList.add("is-visible");
      }
    };

    document.documentElement.classList.add("kinoluma-reveal-ready");

    if (prefersReducedMotion) {
      elements.forEach(reveal);

      return () => {
        isDisposed = true;
        document.documentElement.classList.remove("kinoluma-reveal-ready");
        elements.forEach((element) => {
          element.classList.remove("collection-reveal-item", "is-visible");
          element.style.removeProperty("--collection-reveal-delay");
        });
      };
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) {
            return;
          }

          reveal(entry.target);
          observer.unobserve(entry.target);
        });
      },
      {
        root: null,
        rootMargin: "0px 0px -10% 0px",
        threshold: 0.08,
      },
    );

    const startId = window.setTimeout(() => {
      elements.forEach((element) => {
        const box = element.getBoundingClientRect();
        const isAlreadyVisible = box.top < window.innerHeight * 0.94 && box.bottom > 0;

        if (isAlreadyVisible) {
          reveal(element);
          return;
        }

        observer.observe(element);
      });
    }, 90);

    return () => {
      isDisposed = true;
      window.clearTimeout(startId);
      observer.disconnect();
      document.documentElement.classList.remove("kinoluma-reveal-ready");
      elements.forEach((element) => {
        element.classList.remove("collection-reveal-item", "is-visible");
        element.style.removeProperty("--collection-reveal-delay");
      });
    };
  }, []);

  return null;
}
