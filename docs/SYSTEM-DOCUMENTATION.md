# Book Lab demo booking page: system documentation

Authored by Book Lab - Devops. Last updated 2 October 2026.

This document covers the demonstration site only. It is separate from the Book Lab booking platform and from any client's booking page (including Skinscape 360), which are documented in the platform repository.

## 1. Purpose

A public demonstration of a Book Lab online booking page, for prospective clinics and for Elixir to share with their customers. The clinic shown, **Remarkable Health**, is fictional. The page carries Book Lab's own branding so no real clinic is represented.

| | |
|---|---|
| Live URL | https://demo.booklab.co.nz |
| Azure hostname | https://wonderful-mud-0d4dc2000.3.azurestaticapps.net |
| Went live | 2 October 2026 |
| Repository | `projectit-git-hub/booklab-demo` (private, `main` = production) |
| Local working copy | `C:\Users\DominicZolezziProjec\dev\booklab-demo` (never inside OneDrive) |

## 2. What it is, and is not

- The same four-step flow and fields as a live clinic page: service, date and time, details, confirm.
- **Static sample data only.** Availability is generated in the browser from a fixed formula, the confirmation is simulated, and nothing a visitor types is sent anywhere. The content security policy sets `connect-src 'none'` and `form-action 'none'`, so the browser cannot send form data even if the code were changed by mistake.
- **Not connected** to the Book Lab API (api.booklab.nz) or to Elixir. No tenant entry, no Key Vault, no secrets, no patient data.
- A notice bar at the top of every screen and a panel on the confirmation screen state that it is a demonstration and no booking is made.

Connecting the demo to Elixir staging in future would mean adding a `demo` tenant to the platform repository. That is a platform change and is out of scope for this repository.

## 3. Architecture

```
Visitor browser
  └─ https://demo.booklab.co.nz        Cloudflare (booklab.co.nz zone, proxied CNAME, TLS 1.3 minimum)
        └─ Azure Static Web App  booklab-web-demo  (Free tier)
              static files only: index.html, styles.css, app.js, assets
```

There is no server-side code, database or API.

### Azure

| Item | Value |
|---|---|
| Tenant | Book Lab Limited |
| Subscription | Book Lab - SaaS Platform |
| Resource group | `rg-booklab-demo` (New Zealand North), tags `product=booklab`, `clientId=demo` |
| Static Web App | `booklab-web-demo`, Free tier, metadata region East Asia (content is served globally) |
| Custom domain | `demo.booklab.co.nz`, status Ready, certificate managed by Azure |
| Template | `infra/main.bicep` |

### Cloudflare

Zone booklab.co.nz: one record, CNAME `demo` -> `wonderful-mud-0d4dc2000.3.azurestaticapps.net`, proxied. The zone's minimum TLS version (1.3) applies to this hostname. No page rules, workers or transform rules are used for the demo.

### GitHub

- Workflow `.github/workflows/deploy.yml`: every push to `main` deploys `site/` to the Static Web App; pull requests get a preview environment that is removed when the pull request closes.
- After each production deploy the workflow checks that the hostname refuses TLS 1.2 and that the page is served with `X-Robots-Tag: noindex`. A failure of either turns the run red.
- One repository secret: `AZURE_SWA_TOKEN_DEMO` (the Static Web App deploy token). It was set with the GitHub CLI because the web form rejected it.

## 4. Repository layout

```
site/                         the deployed site, no build step
  index.html                  page structure and fixed copy
  styles.css                  all styling (Book Lab palette and Archivo)
  app.js                      booking flow, services list, sample availability
  staticwebapp.config.json    security headers, CSP, noindex, fallback routing
  robots.txt                  Disallow: /
  .well-known/security.txt    disclosure contact, points to the Book Lab policy
  assets/                     self-hosted Archivo font, vendored qrcode.min.js, favicon
scripts/serve.mjs             local preview server using the production headers
infra/main.bicep              the Static Web App
docs/                         this document
```

## 5. Content

Edit and push; there is nothing to build.

| To change | Edit |
|---|---|
| Services (name, price, duration, description, "Best if", inclusions) | `SERVICES` at the top of `site/app.js` |
| Clinic name, phone number, address, fixed copy | `site/index.html` |
| Place name on the confirmation, reference prefix, booking window | constants under `SERVICES` in `site/app.js` |
| Colours, type sizes, layout | `site/styles.css` |

Current services: total body mole map and skin cancer check ($395, 40 min), specialist consultation ($285, 45 min), minor skin procedure ($460, 30 min). The clinic details, phone number (03 555 0100) and address (Level 1, 12 Example Street, Queenstown) are invented.

Copy standards: no em dashes, no emojis, sentence case, NZ English, red for validation errors only.

### Design decisions for older patients

Agreed on 2 October 2026 and treated as the reference design for Book Lab booking pages:

- 18px base text, nothing readable below 16px, strong contrast on hints and placeholders.
- Each service has a labelled Select button; the long description sits behind "More details".
- Next-step buttons are never disabled. Pressing one too early says what is missing and scrolls to it.
- A "Next available appointment" shortcut picks the earliest day and time in one press.
- Available days are tinted like buttons; unavailable days are faded.
- From step 2 onward the page opens at the progress bar, not the top of the page.
- Date of birth: three typed boxes by default, plus an optional pop-up (decade, year, month, day) that fills the same boxes without typing.
- On small screens the next-step button is in a fixed bar at the bottom.

## 6. Security

The site conforms to the Book Lab security baseline (the governing standard for every Book Lab web property).

- Full header set on every response: HSTS (2 years, includeSubDomains, preload), X-Content-Type-Options, X-Frame-Options DENY, Referrer-Policy, Permissions-Policy, COOP, CORP, COEP, and the legacy-hardening headers.
- CSP: `default-src 'none'; script-src 'self'; style-src 'self'; img-src 'self' data:; font-src 'self'; connect-src 'none'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'; upgrade-insecure-requests`. No `unsafe-inline`: there are no inline scripts, inline styles or inline event handlers.
- Fonts and scripts are self-hosted. The page makes no third-party requests.
- TLS 1.3 minimum at the Cloudflare edge; http redirects to https.
- No secrets in the repository. The only secret is the deploy token, held as a GitHub Actions secret.

### Evidence (live-verified 2 October 2026)

| Check | Result |
|---|---|
| securityheaders.com, `https://demo.booklab.co.nz` | **A+** (scan 02 Oct 2026 10:18 UTC, results hidden from the public list) |
| TLS 1.2 handshake | Refused |
| TLS 1.3 handshake | Accepted, HTTP 200 |
| `http://demo.booklab.co.nz` | 301 to https |
| Headers through Cloudflare | Full set present on pages and assets |
| `X-Robots-Tag` | `noindex, nofollow, noarchive` on pages and assets |
| `/robots.txt` | `Disallow: /` |
| `/.well-known/security.txt` | Served |
| Browser console on load | Clean apart from the open item below |
| CI after deploy | TLS floor and noindex checks pass |

Not yet run: SSL Labs (expected grade A, the ceiling for a TLS 1.3-only host) and Mozilla Observatory.

### Open item

Cloudflare Web Analytics is set to add its beacon script (`static.cloudflareinsights.com/beacon.min.js`) to proxied pages in the booklab.co.nz zone. The CSP blocks it, so nothing loads and no data is sent, but it leaves a console error and is a third-party script the baseline does not allow. Fix: in Cloudflare, Analytics & Logs > Web Analytics > booklab.co.nz > Manage site, disable it or exclude `demo.booklab.co.nz`. Do not add the beacon's origin to the CSP.

## 7. Not crawlable

The demo must stay out of search results. Three layers, all of which must remain:

1. `X-Robots-Tag: noindex, nofollow, noarchive` on every response (`staticwebapp.config.json`).
2. `<meta name="robots" content="noindex, nofollow, noarchive">` in the page.
3. `robots.txt` disallowing everything.

CI checks the header after each production deploy. Do not link to the demo from booklab.co.nz or include it in any sitemap.

## 8. Operations

### Local preview

```
node scripts/serve.mjs
```

Serves `site/` on http://localhost:4173 with the production CSP and headers.

### Deploy

Push to `main`. The workflow deploys and runs the two post-deploy checks. Check a run with `gh run list --repo projectit-git-hub/booklab-demo`.

### Fallback deploy (if GitHub Actions is unavailable)

From the repository root, in Git Bash, signed in to Azure:

```
export SWA_CLI_DEPLOYMENT_TOKEN="$(az staticwebapp secrets list -n booklab-web-demo -g rg-booklab-demo --query properties.apiKey -o tsv | tr -d '\r\n')"
npx --yes @azure/static-web-apps-cli deploy ./site --env production --no-use-keychain
```

The token is read into the environment and is never printed.

### Rotate the deploy token

```
az staticwebapp secrets reset-api-key -n booklab-web-demo -g rg-booklab-demo
gh secret set AZURE_SWA_TOKEN_DEMO --repo projectit-git-hub/booklab-demo --body (az staticwebapp secrets list -n booklab-web-demo -g rg-booklab-demo --query properties.apiKey -o tsv)
```

(Second command is PowerShell syntax.) Rotate if the token is ever exposed.

### Take the demo offline

Remove the `demo` CNAME in Cloudflare, then `az group delete -n rg-booklab-demo`. Nothing else exists.

## 9. Known gaps and next steps

- Disable the Cloudflare Web Analytics beacon for this hostname (section 6).
- Run SSL Labs and Mozilla Observatory and record the results here.
- Add `demo.booklab.co.nz` to the conformance register in the Book Lab security baseline.
- The repository sits under the `projectit-git-hub` account for now. Moving all Book Lab repositories to a Book Lab-owned GitHub organisation is planned as a separate job.
- The phone field accepts New Zealand mobile numbers only. Whether to accept landlines is undecided.
- The reference design in section 5 has not been ported into the platform's client page template.
