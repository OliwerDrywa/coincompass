# Kraut Vercel PR Template

Minimal Vite + React starter for the Hermes software-development loop.

## Local

```bash
npm install
npm run dev
```

## Preview workflow

Every pull request should receive an isolated Vercel preview deployment through the repository's Vercel Git integration. Vercel automatically comments the preview URL on the PR; Hermes shares that URL in chat for mobile review.

## Project setup

1. Create a Vercel project from this repository.
2. Enable the GitHub integration and select the repository.
3. Set Production Branch to `main`.
4. Confirm Preview Deployments are enabled for pull requests.
5. Use `npm run build` as the build command and `dist` as the output directory (Vercel usually detects Vite automatically).

Do not commit tokens. Keep Vercel/GitHub credentials in their respective account settings or secret stores.
