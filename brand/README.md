# Brand images for other platforms

The images here show the LMAA marks where the website does not serve them. They are uploaded by hand.

| File                    | Size       | Where it goes                                               |
| ----------------------- | ---------- | ----------------------------------------------------------- |
| `mastodon-header.png`   | 1500 × 500 | The header of the Mastodon account. X takes the same size.  |
| `lmaa-icon.png`         | 512 × 512  | The media library of the dashboard's social preview editor. |
| `lmaa-wordmark.png`     | 1200 wide  | The media library of the dashboard's social preview editor. |
| `lmaa-claim.png`        | 1200 wide  | The media library of the dashboard's social preview editor. |
| `lmaa-icon-ink.png`     | 512 × 512  | Wherever the logo stands on a light ground.                 |
| `lmaa-wordmark-ink.png` | 1200 wide  | Wherever the wordmark stands on a light ground.             |

The header shows the wordmark over the claim on the dark ground, like the default social image. The three PNGs for the editor have a transparent ground: the icon and the wordmark in gold with the llama's head cut out, the claim in paper with its last word in gold. The editor takes no SVG, which is why they exist as PNGs.

The two ink PNGs have a transparent ground as well. Their squircle and letters are ink black (`#0f0f0f`), and the llama's head is gold (`#cea836`).

All of them are rendered from the drawings in `packages/ui/src/assets/marks`, so a change to a mark reaches them by running:

```bash
node scripts/render-brand-images.mjs
```

Change the drawings, never these files.
