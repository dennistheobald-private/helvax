"use client";

import { useEffect, useState } from "react";
import { prefersReducedMotion, useInView } from "./useInView";

// A 24-hour dial: the business-hours window the company sets, with tests landing
// at random times inside it. Example data only.

const SIZE = 360;
const C = SIZE / 2;
const R = 132;
const WINDOW = { start: 8, end: 17 };

const SCENARIOS = [
  "Supplier bank change", "CEO payment request", "Shared document", "Password expiry",
  "Parking permit QR", "Overdue invoice", "Voicemail notice", "HR policy to sign",
  "IT support callback", "Gift card favour",
];
const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri"];
const FREQUENCIES = [1, 2, 4] as const;

const toXY = (hour: number, r = R) => {
  const a = (hour / 24) * Math.PI * 2 - Math.PI / 2;
  return [C + r * Math.cos(a), C + r * Math.sin(a)] as const;
};

function arc(from: number, to: number, r = R) {
  const [x1, y1] = toXY(from, r);
  const [x2, y2] = toXY(to, r);
  const large = (to - from) / 24 > 0.5 ? 1 : 0;
  return `M ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2}`;
}

const WINDOW_LENGTH = ((WINDOW.end - WINDOW.start) / 24) * 2 * Math.PI * R;

const fmt = (h: number) => `${String(Math.floor(h)).padStart(2, "0")}:${String(Math.round((h % 1) * 60)).padStart(2, "0")}`;

interface Test { hour: number; scenario: string; day: string; id: number }

// Deterministic first state so server and client render the same markup.
const FIRST: Test = { hour: 10.75, scenario: SCENARIOS[0]!, day: "Tue", id: 0 };

export function FrequencyDial() {
  const [ref, inView] = useInView<HTMLDivElement>();
  const [freq, setFreq] = useState<(typeof FREQUENCIES)[number]>(2);
  const [tests, setTests] = useState<Test[]>([FIRST]);
  const current = tests[tests.length - 1]!;

  useEffect(() => {
    if (!inView || prefersReducedMotion()) return;
    let id = 1;
    let last = FIRST.scenario;
    const timer = setInterval(() => {
      const options = SCENARIOS.filter((s) => s !== last);
      const scenario = options[Math.floor(Math.random() * options.length)]!;
      last = scenario;
      const hour = WINDOW.start + 0.25 + Math.random() * (WINDOW.end - WINDOW.start - 0.5);
      const day = DAYS[Math.floor(Math.random() * DAYS.length)]!;
      setTests((t) => [...t.slice(-(freq * 2 - 1)), { hour, scenario, day, id: id++ }]);
    }, 2400);
    return () => clearInterval(timer);
  }, [inView, freq]);

  const [px, py] = toXY(current.hour);

  return (
    <div ref={ref} className="dial-card" data-in={inView || undefined}>
      <div className="dial">
        <svg viewBox={`0 0 ${SIZE} ${SIZE}`} role="img" aria-label={`Example: tests are sent at random times between ${WINDOW.start}:00 and ${WINDOW.end}:00, ${freq} per person per month.`}>
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
          <path d={arc(WINDOW.start, WINDOW.end)} className="dial__window" style={{ strokeDasharray: WINDOW_LENGTH, strokeDashoffset: inView ? 0 : WINDOW_LENGTH }} />
          {tests.slice(0, -1).map((t) => {
            const [x, y] = toXY(t.hour, R - 26);
            return <circle key={t.id} cx={x} cy={y} r={5} className="dial__past" />;
          })}
          <g key={current.id} className="dial__now">
            <circle cx={px} cy={py} r={11} className="dial__pin" />
          </g>
        </svg>
        <div className="dial__center" aria-live="polite">
          <span className="dial__eyebrow">Next test</span>
          <span key={`s${current.id}`} className="dial__scenario">{current.scenario}</span>
          <span className="dial__time">{current.day} · {fmt(current.hour)}</span>
        </div>
      </div>
      <div className="dial__legend">
        <span className="dial__pill"><i className="dial__swatch" />Business hours · 08–17</span>
        <div className="dial__freq" role="radiogroup" aria-label="Tests per person per month">
          {FREQUENCIES.map((f) => (
            <button key={f} type="button" role="radio" aria-checked={freq === f} onClick={() => setFreq(f)}>
              {f}× / month
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
