# Spquizzy

Six daily pasta puzzles, served as a static site. No build step. Open `index.html`, or serve the folder and play.

```bash
python3 -m http.server
```

The daily board is chosen from your local date, so everyone on the same calendar day gets the same puzzle. Easy, medium, and hard are three different boards. Streaks and half-finished plates live in `localStorage` on the device.

Puzzle #1 is 1 January 2026.

## Pages

| Page | What it is |
| --- | --- |
| `index.html` | Landing page. Six equal game cards, hero, footer. |
| `archive.html` | Past puzzles, the last four weeks plus a date jump. |
| `sauce-pipes.html` | Rotate pipes so the sauce reaches the plate. |
| `slip.html` | Slide lasagne trays until the meatball hits the exit. |
| `twirl.html` | Join matching toppings with paths that fill the grid. |
| `even-bowls.html` | Split numbers into bowls with the same total. |
| `ravioli.html` | Join word halves into compound words. |
| `pasta-pips.html` | Lay dominoes so every coloured region meets its rule. |
| `404.html` | Missing-page fallback for GitHub Pages. |

An empty ad slot (`<div class="ad-slot">`) sits under the hero, between the game cards, under each board, and on the result dialog. Nothing in those slots talks to an ad network.

## Tests

```bash
node --test tests/games.test.mjs
```

Node 18 or newer. The tests deal many dates at every difficulty and check that each puzzle is solvable, that par matches a real solution, and that a second deal of the same date is identical.

## GitHub Pages

The site is meant to be published from the `main` branch root. There is no build.

1. On GitHub, open **Settings → Pages**.
2. Under **Build and deployment**, choose **Deploy from a branch**.
3. Branch: **main**. Folder: **/ (root)**.
4. Save.

`.nojekyll` is in the root so Pages serves the files as they are and does not run Jekyll.

## Custom domain later

Do not add a `CNAME` file until the domain is ready. Pages treats that file as the custom host.

1. Add a file named `CNAME` (no extension) at the repository root. Its only line is the hostname, for example `play.example.com`.
2. Commit it to `main`.
3. At the DNS host, point that name at GitHub Pages. A subdomain is a `CNAME` record to `<user>.github.io`. An apex domain uses the `A` and `AAAA` records GitHub documents.
4. In **Settings → Pages → Custom domain**, enter the same hostname.
5. Turn on **Enforce HTTPS** after the certificate is issued.

Until that file exists, the site stays on its `github.io` address.
