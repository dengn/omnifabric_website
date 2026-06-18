# OmniFabric — Marketing Website

A single-page promotional site for **OmniFabric**, the unified intelligence fabric
for data and AI. Built as a dependency-free static site (HTML + CSS + vanilla JS),
so it can be opened directly in a browser or deployed to any static host
(GitHub Pages, Netlify, S3, Nginx, …).

## Design

- **Color tone** is inspired by [taas.cloudsigma.com](https://taas.cloudsigma.com) /
  CloudSigma — a clean, professional, light theme with **teal / cyan** accents
  (`#0bb3c9 → #67e3f2`) and deep teal-navy contrast sections.
- **Content / capabilities** draw on the data-platform and AI-application messaging
  from [matrixorigin.io](https://matrixorigin.io):
  - Hyper-converged, cloud-native data platform (HTAP, decoupled storage/compute,
    native vector search + ML, zero-copy clone & time travel)
  - Multimodal intelligence (unified ingestion, PDF/image/video parsing,
    knowledge-base construction)
  - Production AI agents (auditable decision lineage, self-evolving feedback,
    safe A/B testing, regression gating)
  - Agent memory (long-term context, adaptive learning, audit trails,
    enterprise access control)
  - The **Agent · Model · Data** intelligence flywheel and ROI outcomes.

## Structure

```
index.html                         # all page sections
assets/css/styles.css              # design system + responsive layout
assets/js/main.js                   # sticky header, mobile nav, scroll-reveal
assets/js/auth.js                   # static auth link wiring
server/cloudsigma-broker.js         # CloudSigma OIDC -> MOI SSO token broker
server/node-server.js               # minimal Node HTTP adapter for the broker
```

## Run locally

Just open `index.html`, or serve the folder:

```bash
python3 -m http.server 8000
# then visit http://localhost:8000
```

## CloudSigma SSO broker

The static site links `Sign in` and `Start building` to a small broker under
`/auth/cloudsigma/*`. The broker runs the CloudSigma OIDC authorization-code
flow, calls MOI's trusted internal login endpoint, then redirects the browser to
MOI's `/sso-bridge` with a one-time token.

### Design

The website itself stays static and does not handle CloudSigma tokens in browser
JavaScript. A small server-side broker owns the sensitive part of the flow:

- It starts the CloudSigma OIDC authorization-code flow.
- It stores a signed, HTTP-only `state` cookie to protect the callback.
- It exchanges the callback `code` for a CloudSigma access token using the
  CloudSigma OIDC client secret.
- It reads the CloudSigma user profile from the OIDC `userinfo` endpoint.
- It calls MOI's trusted internal login endpoint with a shared internal token.
- It redirects the browser to MOI's `/sso-bridge` with the short-lived,
  one-time MOI SSO token.

This design keeps both the CloudSigma client secret and the MOI internal token
out of the static website. The browser only sees normal redirects and the final
short-lived `sso_token`; MOI consumes that token once and stores its own
access/refresh tokens in the MOI frontend.

### End-to-end flow

```text
Browser
  -> GET /auth/cloudsigma/login?redirect=https://genai.next.cloudsigma.com/
       or /auth/cloudsigma/register?redirect=...

Broker
  -> 302 CloudSigma authorization endpoint
     - response_type=code
     - client_id=<CLOUDSIGMA_CLIENT_ID>
     - redirect_uri=https://<website-host>/auth/cloudsigma/callback
     - state=<signed-state-cookie-state>

CloudSigma SSO
  -> authenticates/registers the user
  -> 302 /auth/cloudsigma/callback?code=<code>&state=<state>

Broker
  -> validates state cookie
  -> POST <CLOUDSIGMA_ISSUER>/protocol/openid-connect/token
  -> GET  <CLOUDSIGMA_ISSUER>/protocol/openid-connect/userinfo
  -> POST <OMNIFABRIC_MOI_APP_URL>/newmoi/internal/cloudsigma/login
       X-MOI-Internal-Token: <MOI_INTERNAL_TOKEN>
       {
         "cloudsigma_uuid": "<userinfo.sub>",
         "email": "<userinfo.email>",
         "first_name": "<userinfo.given_name>",
         "last_name": "<userinfo.family_name>",
         "sso": true
       }

MOI backend
  -> creates or links the CloudSigma user
  -> returns data.sso_token

Broker
  -> 302 https://genai.next.cloudsigma.com/sso-bridge?token=<sso_token>&redirect=<internal-path>

MOI frontend
  -> calls /newmoi/auth/cs/sso-token
  -> stores MOI access/refresh tokens
  -> navigates to the requested MOI page
```

### Routes

The broker exposes three GET endpoints:

```text
GET /auth/cloudsigma/login
GET /auth/cloudsigma/register
GET /auth/cloudsigma/callback
```

`login` and `register` accept an optional `redirect` query parameter. It should
be an HTTPS URL under the MOI app origin, for example:

```text
/auth/cloudsigma/login?redirect=https%3A%2F%2Fgenai.next.cloudsigma.com%2Fworkspace%2F1
```

The broker only forwards `redirect` to MOI as an internal path when its origin
matches `OMNIFABRIC_MOI_APP_URL`. External redirect origins are not passed to
MOI.

### Configuration

Run the broker locally:

```bash
AUTH_COOKIE_SECRET=<random-cookie-secret> \
CLOUDSIGMA_ISSUER=https://oauth-stg.cloudsigma.com/realms/cloudsigma \
CLOUDSIGMA_CLIENT_ID=cloudsigma \
CLOUDSIGMA_CLIENT_SECRET=<cloudsigma-client-secret> \
OMNIFABRIC_MOI_APP_URL=https://genai.next.cloudsigma.com/ \
MOI_INTERNAL_TOKEN=<same value as cs-component:moi-cloudsigma-internal-token> \
node server/node-server.js
```

Environment variables:

- `AUTH_COOKIE_SECRET`: random secret used to sign the callback `state` cookie.
  Use a long random value and rotate it carefully because active login attempts
  depend on it.
- `CLOUDSIGMA_ISSUER`: CloudSigma Keycloak realm issuer, without a trailing
  slash. Example: `https://oauth-stg.cloudsigma.com/realms/cloudsigma`.
- `CLOUDSIGMA_CLIENT_ID`: OIDC client ID registered in CloudSigma. Current
  CloudSigma/MOI config expects `cloudsigma`.
- `CLOUDSIGMA_CLIENT_SECRET`: OIDC client secret. This must only exist in the
  broker runtime, never in static HTML or JS.
- `OMNIFABRIC_MOI_APP_URL`: public MOI frontend origin. For next:
  `https://genai.next.cloudsigma.com/`.
- `MOI_INTERNAL_TOKEN`: shared secret used to call MOI's
  `/newmoi/internal/cloudsigma/login` endpoint. This must match
  `cs-component:moi-cloudsigma-internal-token` in the `cs-component/next`
  Pulumi stack.

### Deployment topology

Production should route only `/auth/cloudsigma/*` to this broker. Static assets
and HTML can continue to be served by the existing static hosting path.

Example topology:

```text
https://next.cloudsigma.com/
  /                         -> static OmniFabric website
  /assets/*                 -> static assets
  /auth/cloudsigma/*        -> CloudSigma broker

https://genai.next.cloudsigma.com/
  /                         -> MOI frontend
  /newmoi/*                 -> MOI backend proxy
```

The CloudSigma OIDC client must allow this callback URL:

```text
https://next.cloudsigma.com/auth/cloudsigma/callback
```

If the website is served from a different host, update the CloudSigma client
redirect URI and the static `assets/js/auth.js` runtime config accordingly.

### Runtime config for static links

By default `assets/js/auth.js` points links at local broker paths:

```text
/auth/cloudsigma/login
/auth/cloudsigma/register
```

If the broker runs on a separate origin, define `window.OMNIFABRIC_AUTH_CONFIG`
before loading `assets/js/auth.js`:

```html
<script>
  window.OMNIFABRIC_AUTH_CONFIG = {
    loginUrl: "https://accounts.next.cloudsigma.com/auth/cloudsigma/login",
    registerUrl: "https://accounts.next.cloudsigma.com/auth/cloudsigma/register",
    moiAppUrl: "https://genai.next.cloudsigma.com/"
  };
</script>
```

### Security notes

- Use HTTPS in production. The broker sets the state cookie as `Secure`,
  `HttpOnly`, and `SameSite=Lax`.
- Do not expose `CLOUDSIGMA_CLIENT_SECRET` or `MOI_INTERNAL_TOKEN` to browser
  JavaScript.
- The MOI internal endpoint is protected by `X-MOI-Internal-Token`; deploy the
  broker in a trusted runtime and restrict network access when possible.
- The `sso_token` returned by MOI is short-lived and one-time use. It is still
  placed in the browser URL while being handed to `/sso-bridge`, so avoid logging
  full query strings at CDN, ingress, and application layers.
- The broker does not accept arbitrary non-HTTPS redirect URLs. Only redirects
  matching the MOI app origin are forwarded to MOI as internal paths.

For production, put this broker behind the same host as the website or port the
`server/cloudsigma-broker.js` `handleRequest()` function to your edge runtime.

## Sections

Hero · trusted-by logos · intelligence flywheel (pillars) · stats · platform
capabilities (4 feature blocks) · ROI outcomes · solutions · how it works · CTA · footer.
