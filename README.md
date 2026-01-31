# Toaster Bulider Monorepo

<img width="5888" height="2208" alt="breadcube_gradient_banner" src="https://github.com/user-attachments/assets/b2966606-191e-451f-8ff5-268ffaf1f58a" />

## Help contribute to toaster! 
Create and share courses — Use the live builder → https://builder.toaster.cloustan.org to make courses (tutorials, lessons, interactive guides and quizzes). Upload your course or Download it offline as a .toaster file.
## Using the Bulider
- Create you course using the live builder → https://builder.toaster.cloustan.org (dont worry your changes are automaticly saved)
- You can add images and text, as well as well as algorthims, goals and instructions
- Upload your course or Download it offline as a .toaster file.
This repository contains:

- packages/builder: Static web UI
- packages/worker: Cloudflare Worker

## Live URL
- Builder: https://builder.toaster.cloustan.org

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

### Builder
- npx wrangler pages deploy packages/builder --project-name toaster-builder
- Bind custom domain in Cloudflare Dashboard → Pages → toaster-builder → Custom domains

### Worker
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
