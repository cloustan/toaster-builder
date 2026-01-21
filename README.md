# Toaster Monorepo

This repository contains:

- packages/builder: Static web UI (Cloudflare Pages)
- packages/worker: Cloudflare Worker (Wrangler)

## Live URLs
- Builder (Pages): https://ac5cb599.toaster-builder.pages.dev (custom domain pending: https://builder.toaster.cloustan.org)
- Worker: https://toaster-bulider-worker.choits824.workers.dev

## Local Development

### Builder
- Open packages/builder/index.html directly in your browser.

### Worker
- cd packages/worker
- npm install
- npx wrangler login
- npx wrangler secret put COURSE_SECRET_KEY
- npm run dev

## Deploy

### Builder (Pages)
- npx wrangler pages deploy packages/builder --project-name toaster-builder
- Bind custom domain in Cloudflare Dashboard → Pages → toaster-builder → Custom domains

### Worker (Wrangler)
- cd packages/worker
- npm run deploy

## Structure
```
packages/
  builder/
    index.html
  worker/
    package.json
    wrangler.toml
    src/index.js
    test/worker.test.js
```

## Branching
- main: monorepo with both builder and worker
- frontend: branch for UI changes under packages/builder
- backend: branch for Worker changes under packages/worker
