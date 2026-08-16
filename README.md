# CoinCompass

A front-end-only currency search and mental conversion assistant. CoinCompass fetches current reference rates from the free [Frankfurter API](https://frankfurter.dev/) and ranks short chains of easy arithmetic operations to approximate each exchange rate.

## Features

- Searchable index of ECB-supported currencies
- Live reference rates with no API key or backend
- Ranked mental-math routes using ×/÷ 2, 3, 4, 5, 8, 10 and ±10/20/25%
- Effort and approximation-error indicators
- Responsive interface for travel and in-store use

## Local development

```bash
npm install
npm test
npm run dev
```

Build with `npm run build`. Rates are reference data for everyday estimates, not trading.

## Quality checks

Run the full local pull-request gate with:

```bash
npm run check
```

This validates formatting, TypeScript, unit tests, unused files and dependencies, and the production build. GitHub Actions runs those checks independently on pull requests and pushes to `main`.
