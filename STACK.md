# Stack decisions

- Cloudflare Workers: public origin, scheduled retention cleanup, static asset delivery
- D1: content-free product event counts
- Cloudflare Rate Limiting: write endpoint protection
- Hono and Hono JSX: worker routing and server-rendered product shell
- Vite+: development, lint, format, type-check, test, and production build
- Browser JavaScript: private local search, local wordbook, offline cache
- JMdict common-only: legally reusable general English-Japanese lexical data

Better Auth is omitted because no server-owned user state exists. D1 is not used for dictionary lookup so queries do not leave the browser.
