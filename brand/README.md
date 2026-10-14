# Brand images for other platforms

The images here show the LMAA marks where the website does not serve them. They are uploaded by hand.

| File                     | Size        | Where it goes                                               |
| ------------------------ | ----------- | ----------------------------------------------------------- |
| `mastodon-header.jpg`    | 1500 × 500  | The header of the Mastodon account. X takes the same size.  |
| `mastodon-avatar.png`    | 400 × 400   | The avatar of the Mastodon account.                         |
| `bluesky-banner.jpg`     | 2000 × 667  | The banner of the Bluesky account.                          |
| `bluesky-avatar.png`     | 1000 × 1000 | The avatar of the Bluesky account.                          |
| `github-preview.jpg`     | 1280 × 640  | The social preview in the GitHub repository's settings.     |
| `lmaa-icon.png`          | 512 × 512   | The media library of the dashboard's social preview editor. |
| `lmaa-wordmark.png`      | 1200 wide   | The media library of the dashboard's social preview editor. |
| `lmaa-claim.png`         | 1200 wide   | The media library of the dashboard's social preview editor. |
| `lmaa-icon-ink.png`      | 512 × 512   | Wherever the logo stands on a light ground.                 |
| `lmaa-wordmark-ink.png`  | 1200 wide   | Wherever the wordmark stands on a light ground.             |
| `lmaa-icon-gold.png`     | 512 × 512   | Wherever the logo shows in gold, as the favicon does.       |
| `lmaa-wordmark-gold.png` | 1200 wide   | Wherever the wordmark shows in gold.                        |

The banners stand in the shop window, like the default social image, the email masthead and the README's hero: the photograph `shop-window.jpg` under the veil the home page lays over its photographs, the wordmark in gold, a gold line fading out at both ends, and the claim in light grey with its last word in gold. The Mastodon header and the Bluesky banner set the three in one row, because Mastodon's web view shows a header only as a strip cut from its middle.

The avatars show the icon in gold with the llama's head in ink, as the favicon does. The Bluesky one is smaller inside its square, because Bluesky shows avatars round.

The three PNGs for the editor have a transparent ground: the icon and the wordmark in gold with the llama's head cut out, the claim in paper with its last word in gold. The editor takes no SVG, which is why they exist as PNGs.

The ink and the gold PNGs have a transparent ground as well. In the ink ones the squircle and the letters are ink black (`#0f0f0f`) and the llama's head is gold (`#cea836`). The gold ones swap the two colors.

All of them are rendered from the drawings in `packages/ui/src/assets/marks`, so a change to a mark reaches them by running:

```bash
node scripts/render-brand-images.mjs
```

Change the drawings, never these files.

## shop-window.jpg

[Closed door](https://unsplash.com/photos/closed-door-D2ArvCaoEAM) by [Taylor Vick](https://unsplash.com/@tvick), from Unsplash, 2400 px wide. It is one of the photographs in the home page's rotation. The [Unsplash License](https://unsplash.com/license) allows using and changing it for free, without permission and without credit; the credit stands here anyway.
