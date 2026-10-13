# LMAA marks

The source drawings of the LMAA wordmark and icon. Every other form of the marks, such as favicons, social images and the marks the site and the dashboard show, is derived from these two files. Both fill with `currentColor`, so the place that shows them decides their color.

## lmaa-wordmark.svg

The word LMAA as one closed outline, with the llama's head on the stem of the L. The letters run into one another: the foot of the L carries the M, and the M and both A share their feet. Each A's crossbar hangs from its right leg and ends on the left in a round cap. The box is the ink's own, without a margin.

## lmaa-icon.svg

The L with the llama, cut out of a square tile with rounded corners. Its stem and foot are heavier than in the wordmark so it holds at small sizes. The letter keeps the same distance from all four sides of the tile, and the end of its foot is rounded around the same center as the tile's corner.

The letter is there a second time as a path of its own with the class `lmaa-icon-letter` and no fill. A place that wants the letter in a color of its own fills that path; everywhere else the letter stays cut out.

## How they are made

`scripts/build-brand-marks.mjs` constructs both drawings and writes them here. Run it after changing anything in it:

```bash
npm run brand:marks
```

The letters are built from straight edges measured off Google Sans Flex at wght 559, wdth 125, ROND 100 and opsz 144. Every rounded corner is a circular arc that touches both of its edges, so no edge meets an arc at an angle. The llama's head is a drawing, so it is the one part made of Bézier curves.

`scripts/build-brand-marks.test.mjs` fails when a file here differs from what the generator writes, and when an arc meets its neighbor at an angle. Edit the generator, not the files.

## Fonts

The letters are measured from [Google Sans Flex](https://fonts.google.com/specimen/Google+Sans+Flex), and the head is drawn after [Bodoni Moda](https://github.com/indestructible-type/Bodoni). Both are published under the SIL Open Font License 1.1. A logo made from an OFL font is not subject to that license, and its maker holds its copyright, as [questions 1.1 and 1.1.1 of the OFL FAQ](https://openfontlicense.org/ofl-faq/) state.
