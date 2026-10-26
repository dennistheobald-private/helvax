"use client";

import { useEffect, useRef } from "react";
import { prefersReducedMotion } from "@helvax/ui/react";

// The Split mark behind the hero. Its halves drift apart, the gap between what tests
// measure and what really happens, and close as you scroll. Transform only.
export function HeroGap() {
  const ref = useRef<SVGSVGElement>(null);

  useEffect(() => {
    const svg = ref.current;
    if (!svg || prefersReducedMotion()) return;
    let frame = 0;
    let visible = true;
    const start = performance.now();
    const io = new IntersectionObserver(([e]) => {
      visible = !!e?.isIntersecting;
      if (visible && !frame) frame = requestAnimationFrame(tick);
    });
    io.observe(svg);

    function tick(now: number) {
      frame = 0;
      if (!visible) return;
      const hero = svg!.parentElement!;
      const closed = Math.min(1, Math.max(0, window.scrollY / (hero.offsetHeight * 0.7)));
      const drift = 0.55 + 0.45 * Math.sin((now - start) / 1600 - Math.PI / 2) * -1;
      svg!.style.setProperty("--gap", ((1 - closed) * drift).toFixed(3));
      frame = requestAnimationFrame(tick);
    }
    frame = requestAnimationFrame(tick);
    return () => { io.disconnect(); cancelAnimationFrame(frame); };
  }, []);

  return (
    <svg ref={ref} className="hero__gap" viewBox="-40 -20 180 140" aria-hidden="true" focusable="false">
      <path d="M44 12A44 44 0 0 0 44 100Z" />
      <path d="M56 0A44 44 0 0 1 56 88Z" />
    </svg>
  );
}
