# Agent Guidelines for My Recipe Journal

Essential context for AI agents working on this codebase.

## Project Overview

**Whiskers** — a recipe journaling app for bakers and beverage creatives.
Next.js App Router + React 18, Drizzle ORM on libsql/Turso, React Query, Radix
UI. Features: AI recipe import (URL / photo / pasted text), version tracking,
ingredient intelligence, baker's percentages, and yield scaling.

## Core Technologies

- **Framework:** Next.js 14 App Router, React 18, TypeScript (strict)
- **Database:** Drizzle ORM on libsql / Turso (SQLite). Schema is the source of
  truth in `src/db/schema.ts`; migrations in `drizzle/`.
- **UI:** Tailwind CSS + Radix UI themes (`@radix-ui/themes`)
- **State:** React Query (cache persisted to IndexedDB) + `RecipeStore` context
- **Auth:** Better Auth (magic link + passkeys); session also carries
  `preferredUnitSystem`
- **AI:** Google Gemini (`gemini-2.5-flash`) for photo/URL/text extraction and
  the recipe assistant
- **PWA:** next-pwa

## Project Structure

```
src/
├── app/            # routes & API handlers (app/api/*)
├── components/     # UI (recipes/, layout/, ui/, providers/)
├── db/             # Drizzle schema (schema.ts) + client (index.ts)
├── hooks/          # React hooks
├── lib/            # utilities (units, rate-limit, gemini, recipe-importers/…)
├── server/         # service layer (recipesService.ts — all DB access)
├── store/          # RecipeStore (React Query provider)
└── types/          # TypeScript definitions
drizzle/            # generated SQL migrations + meta
docs/               # architecture & feature docs
```

## Key Patterns

1. **Service layer:** API routes in `src/app/api/*` delegate all business logic
   and DB access to `src/server/recipesService.ts`.
2. **React Query:** all fetching via hooks; `staleTime: Infinity` with explicit
   invalidation after mutations (see Caching below).
3. **Radix UI first:** use `@radix-ui/themes` primitives (`Button`,
   `TextField.Root`, `Select.Root`, `Dialog.Root`, `Flex`/`Box`, `Text`…) and
   `@radix-ui/react-icons`, not raw HTML elements.
4. **Type safety:** types in `src/types/`; DB row types via Drizzle
   `$inferSelect` / `$inferInsert`.

## Development Workflow

Quality gates (run before completing work; a lint-staged pre-commit hook also
runs prettier + eslint + typecheck on staged files):

```bash
npm run typecheck   # tsc --noEmit
npm run lint        # eslint, max-warnings=0
npm run test        # vitest (unit tests live next to source as *.test.ts)
npm run format      # prettier
```

### Database changes

1. Edit `src/db/schema.ts`.
2. `npm run db:generate` (drizzle-kit; works offline — diffs the schema).
3. Apply with `npm run db:migrate` (needs `TURSO_*` env). Keep migrations
   additive where possible.

### Adding API endpoints

Route handler in `src/app/api/*` → logic in `recipesService.ts` → optional hook
in `RecipeStore.tsx` → types in `src/types/`. Guard authenticated routes with
`requireAuth` from `src/lib/auth-utils.ts` (API routes are NOT covered by
`middleware.ts`, which only protects pages).

## Feature Notes

### Recipe import (URL / photo / text)

- Routes: `from-url`, `from-photo`, `from-text` (extract) → `import` (atomic
  save). All require auth and are rate-limited per user (`src/lib/rate-limit.ts`).
- URL importer tries schema.org JSON-LD first, then a cleaned-HTML Gemini call.
- All extractor output passes through `src/lib/recipe-importers/normalize.ts`.
- Shared editable preview: `ImportPreviewEditor` (edit fields/ingredients/steps
  - metric/imperial/original unit toggle).
- See [Recipe Import Guide](docs/features/recipe-import.md).

### Units & measurement preference

- `src/lib/units.ts` converts metric↔imperial (density-aware volume→grams) and
  rewrites temperatures. Driven by `users.preferredUnitSystem`
  (`useUnitSystem()`), set on the `/settings` page.

### Photos

- Multi-photo per version with captions/reordering (`PhotoUploadSection`,
  `usePhotoUpload`). The lightbox shows photos from **all versions** tagged by
  version; uploads can target any version.

### AI assistant & photo extraction

- Gemini code in `src/lib/gemini.ts` (extraction) and
  `src/lib/gemini-assistant.ts` (assistant). Requires `GEMINI_API_KEY`.
- See [Photo Extraction](docs/features/photo-extraction.md).

## Important Files

- `src/server/recipesService.ts` — all DB access / business logic
- `src/db/schema.ts` — Drizzle schema (source of truth)
- `src/store/RecipeStore.tsx` — React Query setup & hooks
- `src/lib/recipe-importers/` — importers, JSON-LD, normalizer
- `src/lib/units.ts`, `src/lib/ingredient-helpers.ts`
- `middleware.ts` — page auth redirect

## Environment Variables

- `TURSO_DATABASE_URL` (required), `TURSO_AUTH_TOKEN` — database
- `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, `NEXT_PUBLIC_BETTER_AUTH_URL` — auth
- `GEMINI_API_KEY` — AI import/assistant (optional; features degrade without it)
- `RESEND_API_KEY`, `FROM_EMAIL` — magic-link email (optional)
- R2/S3 (`@aws-sdk/client-s3`) for photo storage; falls back to base64 if unset

## Caching Strategy

React Query cache is persisted to IndexedDB (`idb-keyval`), `staleTime:
Infinity`, `gcTime: 24h`. Data updates rely on explicit
`queryClient.invalidateQueries` after mutations.

## Code Standards

- Match surrounding style; minimal comments (only for non-obvious logic).
- Never commit secrets; review diffs before committing.
- All docs go under `docs/` (except this file and CLAUDE.md); link new docs here.
- Use descriptive commit messages (`git log --oneline -5` for style).

---

**Remember:** verify changes, match existing patterns, run the quality gates.
