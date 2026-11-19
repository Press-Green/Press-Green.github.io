# Press Green website

SvelteKit 3 + Svelte 5, prerendered to static HTML with `adapter-static`. Served by GitHub Pages
at **https://press-green.github.io/**, deployed by GitHub Actions on every push to `main`.

```bash
bun install
bun run dev       # http://localhost:5173
bun run check     # types and Svelte diagnostics
bun run build     # static site in build/
bun run preview   # serves build/ at http://localhost:4173
```

## Layout

| Path | |
| --- | --- |
| `src/routes/(site)/` | Studio pages: home, `privacy.html`, `delete-account.html`. Shared header and footer in `src/lib/site/SiteFrame.svelte` |
| `src/routes/+error.svelte` | Not-found page. The build writes it as `404.html`, which GitHub Pages serves for every unknown URL |
| `src/routes/word-seed/tv/` | WORD SEED TV: shows a multiplayer room on a big screen. Code in `src/lib/word-seed/tv/` |
| `src/routes/word-seed/join/` | Where the TV's QR code lands: opens the app in the room |
| `src/lib/site/company.ts` | Studio name, legal name, CNPJ, email, GitHub. Used by every page and the JSON-LD |
| `src/lib/site/site.css` | The studio look, scoped under `.press-green` |
| `src/lib/word-seed/theme.css` | The game look (word-seed-game's dark theme), scoped under `.word-seed` |
| `static/` | Copied to the site root as is: `assets/`, `app-ads.txt`, `.well-known/assetlinks.json`, Google verification file, `robots.txt`, `sitemap.xml`, `site.webmanifest`, `.nojekyll` |
| `.github/workflows/deploy.yml` | Check, build, verify fixed URLs, publish to Pages |

Imports from `src/lib` use `#lib/...` with the file extension (`#lib/site/company.ts`).

### URLs that must not change

They're stored outside this repo, so a rename breaks something live. The deploy workflow fails
if any of them is missing from the build.

| URL | Used by |
| --- | --- |
| `/privacy.html`, `/delete-account.html` | Play Console (privacy policy, Data safety → data deletion) |
| `/app-ads.txt` | AdMob, must stay at the root |
| `/.well-known/assetlinks.json` | Android App Links: `/word-seed/join` opens the app |
| `/word-seed/join/?code=ABCD` | The TV's QR codes, the app's share link (`word-seed-game/src/multiplayer/join-link.ts`) |
| `/word-seed/tv` | Shown in the app (`word-seed-game/src/api/rooms.ts`) |
| `/google3654326ff1b82ec7.html` | Google Search Console verification |

A route folder named `privacy.html` builds to `privacy.html`. Routes under `word-seed/` use
`trailingSlash = 'always'`, so they build to `word-seed/<page>/index.html`.

## Testing the TV page

`?api=ws://localhost:3000` points the TV at a local API (`bun run dev` in `word-seed-api`), for
example `http://localhost:5173/word-seed/tv/?api=ws://localhost:3000`.

## Publishing on GitHub Pages

The repository must be named **`Press-Green.github.io`** for the site to live at the root.
One-time setup: repository → Settings → Pages → Source: **GitHub Actions**. After that, every
push to `main` runs `.github/workflows/deploy.yml` and the site updates about a minute later.
Watch it in the repository's Actions tab. A failed check or build leaves the live site as it was.

## Google verification (Play Console organization website)

1. In [Google Search Console](https://search.google.com/search-console), add a **URL prefix**
   property for `https://press-green.github.io/`. Use the same Google account as the Play Console.
2. Verified with the HTML file in `static/`. To use the meta tag instead, add it to the
   `<svelte:head>` of `src/routes/(site)/+page.svelte`.
3. In the Play Console, use `https://press-green.github.io/` as the website, the privacy page as
   the privacy policy URL, and the delete-account page in Data safety → Data deletion.

## Changing things

- Contact email, legal name and CNPJ: `src/lib/site/company.ts`. The privacy and delete-account
  texts also spell them out, so search those two pages too.
- After a logo change, re-render the PNGs in `static/assets/` (`logo.png` 680×731,
  `icon-512/192.png`, `apple-touch-icon.png` 180 on `#121614`, `favicon-32.png`, `og-image.png`
  1200×630). The wordmark uses the Lilita One font, which only loads with an internet connection,
  so render them in a browser that's online.
- When the game gets an in-app "Delete account" button, add it to the delete-account page as the
  first option.
- New pages: add them to `static/sitemap.xml`.
