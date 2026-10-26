"use client";

import { useEffect, useRef } from "react";
import { prefersReducedMotion } from "@helvax/ui/react";

// The Split mark as a fixed backdrop. Its halves start apart, the gap between what tests
// measure and what really happens, and close as you scroll down. It moves only on scroll.
export function HeroGap() {
  const ref = useRef<SVGSVGElement>(null);

  useEffect(() => {
    const svg = ref.current;
    if (!svg || prefersReducedMotion()) return;
    let frame = 0;
    const update = () => {
      frame = 0;
      const max = document.documentElement.scrollHeight - window.innerHeight;
      const progress = max > 0 ? Math.min(1, window.scrollY / (max * 0.6)) : 0;
      svg.style.setProperty("--gap", (1 - progress).toFixed(3));
    };
    const onScroll = () => { if (!frame) frame = requestAnimationFrame(update); };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <svg ref={ref} className="page-gap" viewBox="-40 -20 180 140" aria-hidden="true" focusable="false">
      <path d="M44 12A44 44 0 0 0 44 100Z" />
      <path d="M56 0A44 44 0 0 1 56 88Z" />
    </svg>
  );
}
