"use client";

import { type ReactNode, useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

// Horizontal poster row. Scroll arrows appear only while there are hidden posters in that direction.
export default function ProfileRail({ label, children }: { label: string; children: ReactNode }) {
  const railRef = useRef<HTMLDivElement>(null);
  const [edges, setEdges] = useState({ start: false, end: false });

  const measure = useCallback(() => {
    const rail = railRef.current;
    if (!rail) return;

    const start = rail.scrollLeft > 2;
    const end = rail.scrollLeft + rail.clientWidth < rail.scrollWidth - 2;
    setEdges((current) => (current.start === start && current.end === end ? current : { start, end }));
  }, []);

  useEffect(() => {
    const rail = railRef.current;
    if (!rail) return;

    measure();
    rail.addEventListener("scroll", measure, { passive: true });
    const observer = new ResizeObserver(measure);
    observer.observe(rail);

    return () => {
      rail.removeEventListener("scroll", measure);
      observer.disconnect();
    };
  }, [measure]);

  function scrollByPage(direction: 1 | -1) {
    const rail = railRef.current;
    if (!rail) return;

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    rail.scrollBy({ left: direction * rail.clientWidth * 0.8, behavior: reduceMotion ? "auto" : "smooth" });
  }

  return (
    <div className="klp-rail-wrap">
      <div ref={railRef} className="klp-rail" role="list" aria-label={label}>
        {children}
      </div>
      {edges.start ? (
        <button
          type="button"
          className="klp-rail-arrow klp-rail-arrow--prev"
          onClick={() => scrollByPage(-1)}
          aria-label={`${label}: назад`}
        >
          <ChevronLeft size={20} strokeWidth={2.6} aria-hidden="true" />
        </button>
      ) : null}
      {edges.end ? (
        <button
          type="button"
          className="klp-rail-arrow klp-rail-arrow--next"
          onClick={() => scrollByPage(1)}
          aria-label={`${label}: вперёд`}
        >
          <ChevronRight size={20} strokeWidth={2.6} aria-hidden="true" />
        </button>
      ) : null}
    </div>
  );
}
