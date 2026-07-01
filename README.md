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

## Testing

### Prerequisites

- **Unit tests** need nothing extra.
- **End-to-end tests** run against the **Firebase Emulator Suite**, which requires a **JDK (Java 11+)**. Install one via Homebrew:

  ```bash
  brew install --cask temurin
  java -version   # confirm it's on your PATH
  ```

  First-time Playwright setup also needs the browser binary:

  ```bash
  npx playwright install chromium
  ```

### Running

```bash
npm test          # Vitest unit tests (run once)
npm run test:watch # Vitest in watch mode
npm run test:e2e   # Playwright e2e — boots the emulators, runs, tears down
npm run test:e2e:ui # same, with the Playwright UI runner
```

`test:e2e` wraps Playwright in `firebase emulators:exec --project demo-paper`: it
boots the Auth + Firestore emulators (offline `demo-` project — never touches real
Firebase), starts `next dev` wired to them, runs the specs in `e2e/`, then shuts
everything down. Emulator ports live in `firebase.json` (Auth 9099, Firestore
8080, UI 4000). To poke at the emulators by hand, run `firebase emulators:start`
and open the UI at http://127.0.0.1:4000.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
