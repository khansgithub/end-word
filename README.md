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
