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
index.html            # all page sections
assets/css/styles.css # design system + responsive layout
assets/js/main.js      # sticky header, mobile nav, scroll-reveal
```

## Run locally

Just open `index.html`, or serve the folder:

```bash
python3 -m http.server 8000
# then visit http://localhost:8000
```

## Sections

Hero · trusted-by logos · intelligence flywheel (pillars) · stats · platform
capabilities (4 feature blocks) · ROI outcomes · solutions · how it works · CTA · footer.
