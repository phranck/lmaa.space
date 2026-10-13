# LMAA marks

The drawings of the two LMAA marks and of the claim. The website, the dashboard and the API reference show the marks, and `scripts/render-brand-images.mjs` renders the favicons, the default social image, the email masthead and the README's hero from all three. Each drawing fills with `currentColor`, so the place that shows it decides its color.

All three are outlines drawn from [Bodoni Moda](https://github.com/indestructible-type/Bodoni) by The Bodoni Moda Project Authors, which is published under the SIL Open Font License 1.1. A logo or a graphic made from an OFL font is not subject to the license, and its maker holds its copyright, as [questions 1.1 and 1.1.1 of the OFL FAQ](https://openfontlicense.org/ofl-faq/) state.

## lmaa-wordmark.svg

The word LMAA in Bodoni Moda 700, with the llama's head and neck in the stem of the L.

## lmaa-icon.svg

The L with the llama, cut out of a square with rounded corners. The letter fills 64 % of the tile's width and 80 % of its height, so it reads at the 38 px the header shows it at.

The letter is there a second time as a path of its own with the class `lmaa-icon-letter` and no fill. A place that wants the letter in a color of its own fills that path, as the header and the favicon do; everywhere else the letter stays cut out.

## lmaa-claim.svg

"Lokale Märkte. Alternative Anbieter." in Bodoni Moda italic, 400 with the last word in 500 and a letter spacing of 0.01 em. It was shaped by HarfBuzz from the files of `@fontsource/bodoni-moda` 5.3.0 and drawn with fontTools. The last word is its own path with the id `highlight`, so it can take a color of its own. The box is the letters' own, without any margin.
