# Book Lab demo booking page

A demonstration of a Book Lab online booking page, for prospective clinics and
Elixir to preview. The clinic, **Remarkable Health**, is fictional and the page
carries Book Lab's own branding (Archivo, teal `#3fbac2`, ink `#111111`).

Target hostname: `demo.booklab.co.nz`. Not indexed (see below).

## What it is, and is not

- The same four-step flow and fields as a live clinic page: service, date and
  time, details, confirm.
- **Static sample data only.** Availability is generated in the browser, the
  confirmation is simulated, and nothing a visitor types is sent anywhere.
  The CSP sets `connect-src 'none'` and `form-action 'none'` to enforce that.
- Not connected to the Book Lab API or to Elixir. No secrets, no patient data.

## Layout

```
site/                       the deployed site (no build step)
  index.html  styles.css  app.js
  staticwebapp.config.json  security headers, CSP, noindex
  robots.txt                Disallow: /
  assets/                   self-hosted Archivo font, vendored qrcode.min.js, favicon
scripts/serve.mjs           local preview under the production headers
infra/main.bicep            the Azure Static Web App (booklab-web-demo)
docs/SYSTEM-DOCUMENTATION.md  full documentation: architecture, security evidence, operations
.github/workflows/deploy.yml
```

Clinic details and services live at the top of `site/app.js` and in
`site/index.html`.

## Local preview

```
node scripts/serve.mjs
```

Opens on http://localhost:4173 with the same CSP and headers as production.

## Hosting (same stack as the client booking pages)

Azure Static Web App `booklab-web-demo` (Free) in `rg-booklab-demo`, Book Lab
SaaS Platform subscription, fronted by Cloudflare at `demo.booklab.co.nz`
(proxied CNAME in the booklab.co.nz zone, minimum TLS 1.3). GitHub Actions
deploys `site/` on merge to main and posts a preview on each PR; the deploy
token is the repo secret `AZURE_SWA_TOKEN_DEMO`.

## Not crawlable

Three layers, all of which must stay: `X-Robots-Tag: noindex, nofollow,
noarchive` on every response, the same in a `<meta name="robots">` tag, and
`robots.txt` disallowing everything. CI checks the header after each
production deploy. Do not link to the demo from booklab.co.nz or its sitemap.

## Standards

Conforms to the Book Lab security baseline: full header set, CSP with no
`unsafe-inline` (external stylesheet and script only, no inline handlers or
style attributes), self-hosted fonts and scripts, no third-party requests.
Copy: no em dashes, no emojis, sentence case, NZ English, red for validation
errors only.

Commit convention: end every commit message with `Authored By: Book Lab - Devops`.
