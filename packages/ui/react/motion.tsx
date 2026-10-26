"use client";

import { useEffect, useRef, useState } from "react";

export function prefersReducedMotion(): boolean {
  return typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/** True once the element has scrolled into view. True straight away without IntersectionObserver. */
export function useInView<T extends Element>(margin = "0px 0px -15% 0px") {
  const ref = useRef<T>(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (!("IntersectionObserver" in window)) return setInView(true);
    const io = new IntersectionObserver(([e]) => {
      if (e?.isIntersecting) {
        setInView(true);
        io.disconnect();
      }
    }, { rootMargin: margin });
    io.observe(el);
    return () => io.disconnect();
  }, [margin]);
  return [ref, inView] as const;
}

/** Eases from 0 to `target` once `run` is true. Jumps straight to the target with reduced motion. */
export function useCountUp(target: number, run: boolean, ms = 1400) {
  const [n, setN] = useState(0);
  useEffect(() => {
    if (!run) return;
    if (prefersReducedMotion()) return setN(target);
    let raf = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const p = Math.min(1, (now - start) / ms);
      setN(target * (1 - Math.pow(1 - p, 3)));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [run, target, ms]);
  return n;
}

export interface CountUpProps {
  value: number;
  decimals?: number;
  prefix?: string;
  suffix?: string;
  ms?: number;
}

/**
 * A number that counts up when scrolled into view. Screen readers and the
 * server render get the final value, so nothing depends on the animation.
 */
export function CountUp({ value, decimals = 0, prefix = "", suffix = "", ms }: CountUpProps) {
  const [ref, inView] = useInView<HTMLSpanElement>();
  const n = useCountUp(value, inView, ms);
  const final = `${prefix}${value.toFixed(decimals)}${suffix}`;
  return (
    <span ref={ref} className="hx-countup">
      <span aria-hidden="true">{inView ? `${prefix}${n.toFixed(decimals)}${suffix}` : final}</span>
      <span className="hx-visually-hidden">{final}</span>
    </span>
  );
}
