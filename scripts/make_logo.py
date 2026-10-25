# Regenerates assets/brand/*.svg. Needs fonttools and Inter Display (SIL OFL).
# Usage: python3 scripts/make_logo.py [out_dir] [tracking_em]
import sys
from fontTools.ttLib import TTFont
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen
from fontTools.pens.boundsPen import BoundsPen

FONT = "/usr/share/fonts/opentype/inter/InterDisplay-SemiBold.otf"
OUT = sys.argv[1] if len(sys.argv) > 1 else "assets/brand"
TRACK = float(sys.argv[2]) if len(sys.argv) > 2 else -0.07  # letter spacing, in em

RED = "#D03B2B"
INK = "#16130F"
PAPER = "#FFFFFF"

f = TTFont(FONT)
gs = f.getGlyphSet(); cmap = f.getBestCmap(); upm = f["head"].unitsPerEm
hmtx = f["hmtx"]

ICON = 112.0
asc_target = 0.70 * ICON          # height of 'h' ascender above baseline
h_bounds = BoundsPen(gs); gs[cmap[ord("h")]].draw(h_bounds)
scale = asc_target / h_bounds.bounds[3]
gap = 32.0
x0 = ICON + gap
baseline = ICON / 2 + asc_target / 2

def wordmark():
    paths = []
    x = 0.0
    for i, ch in enumerate("helvax"):
        g = cmap[ord(ch)]
        pen = SVGPathPen(gs, ntos=lambda v: f"{v:.2f}".rstrip("0").rstrip("."))
        tp = TransformPen(pen, (scale, 0, 0, -scale, x0 + x * scale, baseline))
        gs[g].draw(tp)
        paths.append((ch, pen.getCommands()))
        x += hmtx[g][0] + TRACK * upm
    # trim right side bearing of x
    bp = BoundsPen(gs); gs[cmap[ord("x")]].draw(bp)
    width = x0 + (x - hmtx[cmap[ord('x')]][0] - TRACK * upm + bp.bounds[2]) * scale
    return paths, width

paths, width = wordmark()
W = round(width + 2); H = ICON

# Cross uses Swiss flag proportions: arms 1/6 longer than wide (6 wide, 7 long, 20 across).
span = 0.62 * ICON; arm = span * 6 / 20
c = ICON / 2
cross = (f"M{c-arm/2:.2f} {c-span/2:.2f}h{arm:.2f}v{(span-arm)/2:.2f}h{(span-arm)/2:.2f}v{arm:.2f}"
         f"h{-(span-arm)/2:.2f}v{(span-arm)/2:.2f}h{-arm:.2f}v{-(span-arm)/2:.2f}h{-(span-arm)/2:.2f}"
         f"v{-arm:.2f}h{(span-arm)/2:.2f}z")

def icon_svg():
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {ICON:g} {ICON:g}" role="img" aria-label="helvax">\n'
            f'  <rect width="{ICON:g}" height="{ICON:g}" rx="{0.17*ICON:.2f}" fill="{RED}"/>\n'
            f'  <path fill="{PAPER}" d="{cross}"/>\n</svg>\n')

def logo_svg(text_color, x_color):
    body = "".join(f'  <path fill="{x_color if ch == "x" else text_color}" d="{d}"/>\n' for ch, d in paths)
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W} {H:g}" role="img" aria-label="helvax">\n'
            f'  <rect width="{ICON:g}" height="{ICON:g}" rx="{0.17*ICON:.2f}" fill="{RED}"/>\n'
            f'  <path fill="{PAPER}" d="{cross}"/>\n' + body + '</svg>\n')

import os
os.makedirs(OUT, exist_ok=True)
open(f"{OUT}/helvax-logo-light.svg", "w").write(logo_svg(INK, RED))   # for light backgrounds
open(f"{OUT}/helvax-logo-dark.svg", "w").write(logo_svg("#FFFFFF", "#E0463A"))  # for dark backgrounds
open(f"{OUT}/helvax-icon.svg", "w").write(icon_svg())
print("size", W, H)
