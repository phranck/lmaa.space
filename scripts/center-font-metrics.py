#!/usr/bin/env python3
"""Sets the vertical metrics of font files so the middle of the capitals is the middle of the line.

Barlow and Barlow Condensed reserve 1000 units above the baseline and 200 below
it, while their capitals are 700 high. A line of their text therefore carries
its capitals 50 units below its middle, and every label looks too low in its
button. This script keeps the sum of ascender and descender, so line boxes keep
their height, and splits it so that the ascender exceeds the descender by the
cap height. It sets the hhea and the OS/2 typo values, which browsers lay lines
out with. The usWin values stay as they are, because they only bound the glyphs
for clipping.

Run it after replacing any of the site's font files:

    python3 -I scripts/center-font-metrics.py apps/frontend/src/assets/fonts/*.woff2

A file whose capitals are centered already is left as it is. The script needs
fontTools and brotli for Python.
"""

import sys

from fontTools.ttLib import TTFont


def centered_metrics(total, cap_height):
    """The ascender and the descender, negative, that center the capitals in a line of the given height."""
    ascender = (total + cap_height) // 2
    return ascender, ascender - total


for path in sys.argv[1:]:
    font = TTFont(path)
    hhea = font["hhea"]
    os2 = font["OS/2"]
    ascender, descender = centered_metrics(hhea.ascent - hhea.descent, os2.sCapHeight)
    current = (hhea.ascent, hhea.descent, os2.sTypoAscender, os2.sTypoDescender)
    if current == (ascender, descender, ascender, descender):
        print(f"{path}: centered already")
        continue
    hhea.ascent, hhea.descent = ascender, descender
    os2.sTypoAscender, os2.sTypoDescender = ascender, descender
    font.save(path)
    print(f"{path}: ascender {current[0]} to {ascender}, descender {current[1]} to {descender}")
