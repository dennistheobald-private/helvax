import { IBM_Plex_Mono, Inter, Plus_Jakarta_Sans } from "next/font/google";

// next/font downloads these OFL fonts at build time and serves them from our own domain.
const display = Plus_Jakarta_Sans({ subsets: ["latin", "latin-ext"], weight: ["500", "600", "700", "800"], variable: "--hx-font-display", display: "swap" });
const body = Inter({ subsets: ["latin", "latin-ext"], variable: "--hx-font-body", display: "swap" });
const mono = IBM_Plex_Mono({ subsets: ["latin", "latin-ext"], weight: ["400", "500", "600"], variable: "--hx-font-mono", display: "swap" });

export const fontVariables = `${display.variable} ${body.variable} ${mono.variable}`;
