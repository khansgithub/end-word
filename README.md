This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

## Testing

This project uses [Vitest](https://vitest.dev/) for unit tests and [Playwright](https://playwright.dev/) for end-to-end tests.

### Unit Tests (Vitest)

- **`npm run test`** - Run all unit tests once and exit. Tests are located in `src/test/**/*.test.ts`.
- **`npm run test:watch`** - Run unit tests in watch mode, automatically re-running tests when files change. Useful during development.

### End-to-End Tests (Playwright)

- **`npm run test:e2e`** - Run all Playwright e2e tests. Tests are located in `tests/e2e/`. This command automatically starts the dev server on port 4000 if it's not already running.
- **`npm run test:e2e:custom`** - Run custom e2e test script (`tests/e2e/run-tests.ts`). This is an alternative test runner for specific e2e scenarios.

### Running All Tests

- **`npm run test:all`** - Run both unit tests and e2e tests sequentially, saving results to JSON files:
  - Unit test results: `test-results/unit-tests.json`
  - E2e test results: `test-results/e2e-tests.json`
  
  This command is useful for CI/CD pipelines or when you need a complete test run with saved results.

### Development Server for E2E Tests

- **`npm run dev:e2e`** - Start the development server configured for e2e testing (runs on port 4000 with test environment variables). This is automatically started by `test:e2e` if the server isn't already running.

## MSW testing setup

- `msw` is installed as a dev dependency and the worker script lives at `public/mockServiceWorker.js` (generated via `npx msw init public/ --save`).
- Default handlers in `src/mocks/handlers.ts` stub both `/dictionary/word/:word` and `http://localhost:8000/lookup/:word`, returning mock dictionary data.
- For node-based tests, call `startMswTestServer()`/`resetMswHandlers()`/`stopMswTestServer()` from `src/mocks/test-server.ts` inside your test hooks.
- For browser/dev usage, start the worker once on the client (guarded by an env flag if you like):

```ts
if (process.env.NEXT_PUBLIC_API_MOCKING === "enabled" && typeof window !== "undefined") {
  const { worker } = await import("../mocks/browser");
  await worker.start({ onUnhandledRequest: "bypass" });
}
```

- The dev entry point is `npm run dev` (`tsx watch src/server/server.ts`), which serves `public/mockServiceWorker.js` automatically.
