# Press Green website

Plain HTML, no build step. Served by GitHub Pages at **https://press-green.github.io/**.

| File | |
| --- | --- |
| `index.html` | Studio, games, company details (legal name, CNPJ, contact, GitHub) |
| `privacy.html` | Privacy policy for the games, English and Portuguese (LGPD) |
| `delete-account.html` | Account deletion steps, the URL Google Play asks for |
| `404.html`, `robots.txt`, `sitemap.xml`, `site.webmanifest` | The usual extras |
| `assets/` | `logo.svg` (source), `icon.svg` (logo without the wordmark), PNGs rendered from them |

## Publishing on GitHub Pages

For the site to live at the root (`press-green.github.io`, not `press-green.github.io/website`),
the repository must be named **`Press-Green.github.io`**:

```bash
git init && git add -A && git commit -m "feat: Press Green website"
git remote add origin git@github-personal:Press-Green/Press-Green.github.io.git
git push -u origin main
```

Then on GitHub: repository → Settings → Pages → Source: **Deploy from a branch**, `main`, `/ (root)`.
`.nojekyll` makes Pages serve the files as they are.

With a different repository name, the site is at `press-green.github.io/<repo>/` and every
`https://press-green.github.io/` URL in the HTML, `robots.txt` and `sitemap.xml` needs that path
added (the 404 page too, since it links from the root).

## Google verification (Play Console organization website)

1. In [Google Search Console](https://search.google.com/search-console), add a **URL prefix**
   property for `https://press-green.github.io/`. Use the same Google account as the Play Console.
2. Choose **HTML tag**, and paste the `<meta name="google-site-verification" …>` tag into
   `index.html` where the comment marks it. Push, then press Verify.
3. In the Play Console, use `https://press-green.github.io/` as the website, the privacy page as
   the privacy policy URL, and the delete-account page in Data safety → Data deletion.

## Changing things

- Contact email, legal name and CNPJ appear in every page and in the JSON-LD in `index.html`:
  search and replace.
- After a logo change, re-render the PNGs (`logo.png` 680×731, `icon-512/192.png`,
  `apple-touch-icon.png` 180 on `#121614`, `favicon-32.png`, `og-image.png` 1200×630). The
  wordmark uses the Lilita One font, which only loads with an internet connection, so render them
  in a browser that's online.
- When the game gets an in-app "Delete account" button, add it to `delete-account.html` as the
  first option.
