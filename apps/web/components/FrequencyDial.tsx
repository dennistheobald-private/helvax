"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { LogoMark, prefersReducedMotion, useInView } from "@helvax/ui/react";

// The testing rhythm: the chosen frequency puts that many tests on random days of a
// month, and each one lands at a random time on the 24-hour dial. More tests per month
// means more markers and a quicker beat. Example data only.

const SIZE = 360;
const C = SIZE / 2;
const R = 132;
const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const DAYS = 28; // four weeks
const FREQUENCIES = [1, 2, 4] as const;
type Freq = (typeof FREQUENCIES)[number];
const BEAT: Record<Freq, number> = { 1: 2600, 2: 1900, 4: 1300 };

const SCENARIOS = [
  "Supplier bank change", "CEO payment request", "Shared document", "Password expiry",
  "Parking permit QR", "Overdue invoice", "Voicemail notice", "HR policy to sign",
  "IT support callback", "Gift card favour",
];

const toXY = (hour: number, r = R) => {
  const a = (hour / 24) * Math.PI * 2 - Math.PI / 2;
  return [C + r * Math.cos(a), C + r * Math.sin(a)] as const;
};

const RING = 2 * Math.PI * R;
const fmt = (h: number) => `${String(Math.floor(h)).padStart(2, "0")}:${String(Math.floor((h % 1) * 60)).padStart(2, "0")}`;

interface Test { day: number; hour: number; scenario: string }

/** One month of tests: one random day in each equal slice, so tests never bunch up. */
function plan(freq: Freq, rand: () => number): Test[] {
  const slice = DAYS / freq;
  const used = new Set<string>();
  return Array.from({ length: freq }, (_, i) => {
    const options = SCENARIOS.filter((s) => !used.has(s));
    const scenario = options[Math.floor(rand() * options.length)]!;
    used.add(scenario);
    return {
      day: Math.floor(i * slice + rand() * slice),
      hour: rand() * 24,
      scenario,
    };
  });
}

// Seeded so the server render and the first client render match.
function seeded(seed: number) {
  let s = seed;
  return () => ((s = (s * 16807) % 2147483647) - 1) / 2147483646;
}

export function FrequencyDial() {
  const [ref, inView] = useInView<HTMLDivElement>();
  const [freq, setFreq] = useState<Freq>(2);
  const [month, setMonth] = useState(0);
  const [step, setStep] = useState(0);
  const touched = useRef(false);

  const tests = useMemo(() => plan(freq, month === 0 ? seeded(7 + freq) : Math.random), [freq, month]);
  const current = tests[Math.min(step, tests.length - 1)]!;

  // Step through this month's tests at the frequency's beat, then plan a new month.
  // Until someone picks a frequency, move on to the next one after each month.
  useEffect(() => {
    if (!inView || prefersReducedMotion()) return;
    const t = setTimeout(() => {
      if (step < tests.length - 1) return setStep(step + 1);
      if (!touched.current) setFreq(FREQUENCIES[(FREQUENCIES.indexOf(freq) + 1) % FREQUENCIES.length]!);
      setMonth((m) => m + 1);
      setStep(0);
    }, BEAT[freq]);
    return () => clearTimeout(t);
  }, [inView, step, tests.length, freq]);

  function choose(f: Freq) {
    touched.current = true;
    setFreq(f);
    setMonth((m) => m + 1);
    setStep(0);
  }

  const [px, py] = toXY(current.hour);
  const key = `${month}-${freq}-${step}`;

  return (
    <div ref={ref} className="dial-card" data-in={inView || undefined} style={{ ["--beat" as string]: `${BEAT[freq]}ms` }}>
      <div className="dial">
        <svg viewBox={`0 0 ${SIZE} ${SIZE}`} role="img" aria-label={`Example: ${freq} test${freq > 1 ? "s" : ""} per person per month, on random days at random times.`}>
          {Array.from({ length: 24 }, (_, h) => {
            const major = h % 6 === 0;
            const [x1, y1] = toXY(h, R + 22);
            const [x2, y2] = toXY(h, R + (major ? 34 : 28));
            return <line key={h} x1={x1} y1={y1} x2={x2} y2={y2} className={major ? "dial__tick dial__tick--major" : "dial__tick"} />;
          })}
          {[0, 6, 12, 18].map((h) => {
            const [x, y] = toXY(h, R + 50);
            return <text key={h} x={x} y={y} className="dial__label" textAnchor="middle" dominantBaseline="middle">{h}</text>;
          })}
          <circle cx={C} cy={C} r={R} className="dial__track" />
          <circle cx={C} cy={C} r={R} className="dial__window" transform={`rotate(-90 ${C} ${C})`} style={{ strokeDasharray: RING, strokeDashoffset: inView ? 0 : RING }} />
          {tests.slice(0, step).map((t) => {
            const [x, y] = toXY(t.hour, R - 26);
            return <circle key={`${month}-${t.day}`} cx={x} cy={y} r={5} className="dial__past" />;
          })}
          <g key={key} className="dial__now">
            <circle cx={px} cy={py} r={11} className="dial__pin" />
          </g>
        </svg>
        <div className="dial__center" aria-hidden="true">
          <LogoMark width={22} height={22} className="dial__mark" />
          <span className="dial__eyebrow">Test {step + 1} of {freq}</span>
          <span key={`s${key}`} className="dial__scenario">{current.scenario}</span>
          <span className="dial__time">{WEEKDAYS[current.day % 7]} · {fmt(current.hour)}</span>
        </div>
      </div>

      <div className="month" aria-hidden="true">
        <div className="month__head">{WEEKDAYS.map((d) => <span key={d}>{d[0]}</span>)}</div>
        <div key={`m${month}-${freq}`} className="month__grid">
          {Array.from({ length: DAYS }, (_, d) => {
            const i = tests.findIndex((t) => t.day === d);
            const state = i < 0 ? undefined : i < step ? "done" : i === step ? "now" : "next";
            return <i key={d} data-test={state} style={i >= 0 ? { animationDelay: `${i * 90}ms` } : undefined} />;
          })}
        </div>
      </div>

      <div className="dial__legend">
        <div className="dial__freq" role="radiogroup" aria-label="Tests per person per month">
          {FREQUENCIES.map((f) => (
            <button key={f} type="button" role="radio" aria-checked={freq === f} onClick={() => choose(f)}>
              {f}× / month
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
