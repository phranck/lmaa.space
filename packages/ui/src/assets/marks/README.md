# LMAA marks

The drawings of the two LMAA marks and of the claim. The website, the dashboard and the API reference show the marks, and `scripts/render-brand-images.mjs` renders the favicons, the default social image, the email masthead and the README's hero from them. Each drawing fills with `currentColor`, so the place that shows it decides its color.

## lmaa-wordmark.svg

The icon on the left and the word LMAA on its right, as Google Sans Flex sets it at wght 559, wdth 125, ROND 100 and opsz 144. The icon is one and a half times as high as the letters' caps and centered on them. Its head is cut out, so the ground shows through it. The box is the ink's own, without a margin.

## lmaa-icon.svg

The llama's head on a short stub of neck, cut out of a tile shaped as a squircle, the superellipse with exponent 4. The neck ends a little below the throat in a straight cut with rounded corners, and its back bends out a little towards the cut, as an animal's neck does. The figure keeps the same distance from the tile's edge at the top and the bottom and is centered across it.

The head is there a second time as a path of its own with the class `lmaa-icon-head` and no fill. A place that wants the head in a color of its own fills that path, as the header and the favicon do; everywhere else the head stays cut out.

## How the two marks are made

`scripts/build-brand-marks.mjs` constructs both drawings and writes them here. Run it after changing anything in it:

```bash
npm run brand:marks
```

The llama's head is a drawing made of Bézier curves. The tips of its ears and the corners of the neck's cut are circular arcs that touch the curves and edges on both sides. The letters of the wordmark were shaped once by HarfBuzz from Google Sans Flex 5.000 and drawn with fontTools. The generator keeps their outlines, so it needs no font file.

`scripts/build-brand-marks.test.mjs` fails when a file here differs from what the generator writes, when an arc meets its neighbor at an angle, when the back of the neck kinks where it meets the head, and when the tile's curves kink or stray from the superellipse. Edit the generator, not the files.

## lmaa-claim.svg

"Lokale Märkte. Alternative Anbieter." in Bodoni Moda italic, 400 with the last word in 500 and a letter spacing of 0.01 em. It was shaped by HarfBuzz from the files of `@fontsource/bodoni-moda` 5.3.0 and drawn with fontTools. The last word is its own path with the id `highlight`, so it can take a color of its own. The box is the letters' own, without any margin. The social image, the email masthead and the README's hero set it under the wordmark.

## Fonts

The letters of the wordmark are drawn from [Google Sans Flex](https://fonts.google.com/specimen/Google+Sans+Flex), and the llama's head and the claim are drawn after [Bodoni Moda](https://github.com/indestructible-type/Bodoni) by The Bodoni Moda Project Authors. Both are published under the SIL Open Font License 1.1. A logo or a graphic made from an OFL font is not subject to that license, and its maker holds its copyright, as [questions 1.1 and 1.1.1 of the OFL FAQ](https://openfontlicense.org/ofl-faq/) state.
