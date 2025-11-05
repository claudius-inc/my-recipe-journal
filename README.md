# My Recipe Log

Mobile-first recipe journaling app for bakers and beverage creatives. Track iterations, capture tasting notes, manage ingredients with autocomplete, and store everything in a Prisma-backed database.

## Feature Highlights

- **Unified recipe workspace** with sidebar navigation, responsive Radix UI components, and version tabs.
- **Version history & cloning** to duplicate formulas with scaling, baker's percentage tooling, and rich metadata per category.
- **Ingredient intelligence** including role tagging, autocomplete suggestions, and ordering controls.
- **Real persistence** via Prisma + SQLite with seed data for bread, drink, and main course examples.
- **Service-oriented API layer** separating App Router handlers from domain logic for maintainability.
- **React Query integration** delivering cached pagination, optimistic UI hooks, and consistent invalidation on mutations.

## Tech Stack

- **Frontend:** Next.js App Router, React 18, Tailwind CSS, Radix UI themes & icons.
- **State & Data:** React Query, custom RecipeStore provider, fetch-based REST APIs.
- **Backend:** Prisma ORM (SQLite dev database), modular service layer.
- **Tooling:** TypeScript, ESLint, Prettier, Vitest, Playwright-ready scaffolding, Husky + lint-staged.

## Getting Started

1. **Install dependencies**
   ```bash
   npm install
   ```
2. **Environment**
   - Copy `.env` from `.env.example` if provided (default points to `file:./dev.db`).
3. **Database migration & seed**
   ```bash
   npx prisma migrate dev
   npm run db:seed
   ```
4. **Generate Prisma client (optional if migrate already ran)**
   ```bash
   npx prisma generate
   ```
5. **Start the dev server**
   ```bash
   npm run dev
   ```
   Visit `http://localhost:3000` to use the app.

## Quality Checklist

- **Format:** `npm run format`
- **Lint:** `npm run lint`
- **Types:** `npm run typecheck`
- **Unit tests:** `npm run test` (exit code 1 when no spec files are present yet)
- **E2E (Playwright):** `npm run test:e2e` once specs are added

## Project Structure

- `src/app` – App Router routes and layouts.
- `src/components` – UI composition, including sidebar and recipe workspace.
- `src/store/RecipeStore.tsx` – React Query powered state/context.
- `src/server/recipesService.ts` – Business logic and Prisma access.
- `prisma/` – Schema and seed script.
- `docs/` – Supplemental architecture, API, and data model documentation.

## Additional Documentation

- [Architecture](docs/architecture.md)
- [API Reference](docs/api.md)
- [Data Model](docs/data-model.md)

## Deployment Notes

- Set `DATABASE_URL` to your production database before running `next build`.
- Run `npx prisma migrate deploy` and `npx prisma generate` during deployment workflows.
- Seed production cautiously; the provided script overwrites existing data.
