import type { SVGProps } from "react";
import { cx } from "./cx";

/** The Split mark: a disc pulled apart. Inherits `currentColor` unless `brand` is set. */
export function LogoMark({ brand = true, className, ...rest }: SVGProps<SVGSVGElement> & { brand?: boolean }) {
  const fill = brand ? "var(--brand-500)" : "currentColor";
  return (
    <svg viewBox="0 0 100 100" className={cx("hx-mark", className)} aria-hidden="true" focusable="false" {...rest}>
      <path fill={fill} d="M44 12A44 44 0 0 0 44 100Z" />
      <path fill={fill} d="M56 0A44 44 0 0 1 56 88Z" />
    </svg>
  );
}

const WORDMARK =
  "M55 0V-757H205V-496Q222 -520 249 -535Q291 -558 348 -558Q410 -558 456.5 -532.0Q503 -506 529.0 -459.5Q555 -413 555 -351V0H405V-319Q405 -351 392.5 -374.0Q380 -397 357.5 -410.0Q335 -423 305 -423Q276 -423 253.0 -410.0Q230 -397 217.5 -374.0Q205 -351 205 -319V0ZM887.0 12Q800.0 12 736.0 -26.5Q672.0 -65 637.0 -130.0Q602.0 -195 602.0 -274Q602.0 -356 638.5 -420.0Q675.0 -484 737.0 -521.0Q799.0 -558 877.0 -558Q942.0 -558 992.0 -537.5Q1042.0 -517 1076.5 -480.0Q1111.0 -443 1129.0 -394.5Q1147.0 -346 1147.0 -289Q1147.0 -273 1145.5 -257.5Q1144.0 -242 1140.0 -231H758.0Q760.0 -210 768.0 -192Q783.0 -157 814.0 -137.5Q845.0 -118 889.0 -118Q929.0 -118 957.5 -134.0Q986.0 -150 1002.0 -178L1122.0 -121Q1106.0 -81 1071.5 -51.0Q1037.0 -21 990.0 -4.5Q943.0 12 887.0 12ZM761.0 -341H988.0Q987.0 -354 983.0 -366Q972.0 -399 944.5 -418.5Q917.0 -438 877.0 -438Q838.0 -438 810.0 -419.0Q782.0 -400 768.0 -363Q764.0 -353 761.0 -341ZM1205.0 0V-757H1355.0V0ZM1606.0 0 1391.0 -546H1553.0L1671.0 -219L1789.0 -546H1951.0L1736.0 0ZM2156.0 12Q2097.0 12 2054.0 -7.0Q2011.0 -26 1988.0 -61.5Q1965.0 -97 1965.0 -146Q1965.0 -192 1986.0 -227.5Q2007.0 -263 2050.5 -287.0Q2094.0 -311 2159.0 -321L2310.0 -345V-360Q2310.0 -391 2285.5 -412.0Q2261.0 -433 2219.0 -433Q2179.0 -433 2148.5 -411.0Q2118.0 -389 2104.0 -353L1984.0 -410Q2000.0 -456 2035.0 -489.0Q2070.0 -522 2119.0 -540.0Q2168.0 -558 2226.0 -558Q2295.0 -558 2348.0 -533.0Q2401.0 -508 2430.5 -463.5Q2460.0 -419 2460.0 -360V0H2320.0V-52Q2311.0 -42 2301.0 -35Q2272.0 -11 2236.0 0.5Q2200.0 12 2156.0 12ZM2310.0 -235 2186.0 -213Q2154.0 -207 2137.0 -192.5Q2120.0 -178 2120.0 -151Q2120.0 -126 2139.0 -112.0Q2158.0 -98 2186.0 -98Q2223.0 -98 2251.0 -114.0Q2279.0 -130 2294.5 -157.5Q2310.0 -185 2310.0 -218ZM2497.0 0 2688.0 -274 2496.0 -546H2670.0L2776.0 -390L2882.0 -546H3056.0L2864.0 -274L3054.0 0H2881.0L2776.0 -158L2671.0 0Z";

/** The Split lockup: the flat mark plus the heavy lowercase wordmark. The word follows `currentColor`. */
export function Logo({ height = 24, className, title = "Helvax" }: { height?: number; className?: string; title?: string }) {
  return (
    <svg viewBox="0 -757 4031 781" height={height} width={(height * 4031) / 781} className={cx("hx-logo", className)} role="img" aria-label={title}>
      <g className="hx-logo__mark" transform="translate(0 -757) scale(7.57)">
        <path fill="var(--brand-500)" d="M44 12A44 44 0 0 0 44 100Z" />
        <path fill="var(--brand-500)" d="M56 0A44 44 0 0 1 56 88Z" />
      </g>
      <path fill="currentColor" transform="translate(975 0)" d={WORDMARK} />
    </svg>
  );
}

/** The rounded orange app icon with the mark inside, as used in the marketing navbar and hero. */
export function AppIcon({ size = "md", className }: { size?: "sm" | "md"; className?: string }) {
  return (
    <span className={cx("hx-appicon", size === "sm" && "hx-appicon--sm", className)}>
      <svg viewBox="0 0 100 100" className="hx-icon" aria-hidden="true" focusable="false">
        <path fill="currentColor" stroke="none" d="M44 12A44 44 0 0 0 44 100Z" />
        <path fill="currentColor" stroke="none" d="M56 0A44 44 0 0 1 56 88Z" />
      </svg>
    </span>
  );
}
