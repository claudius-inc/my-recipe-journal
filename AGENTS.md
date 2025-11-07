# Agent Guidelines for My Recipe Log

This document provides essential context for AI agents working on this codebase.

## Project Overview

Mobile-first recipe journaling app for bakers and beverage creatives. Built with Next.js App Router, Prisma ORM, React Query, and Radix UI. Features photo-to-recipe extraction via Gemini Vision AI, version tracking, ingredient intelligence with autocomplete, and baker's percentage calculations.

## Core Technologies

- **Framework:** Next.js 15+ App Router, React 18
- **Database:** Prisma ORM with SQLite (dev) / PostgreSQL (production)
- **UI:** Tailwind CSS, Radix UI themes & primitives
- **State Management:** React Query + custom RecipeStore context
- **AI Integration:** Google Gemini Vision API for photo extraction
- **Auth:** Better Auth with magic links (Resend)

## Project Structure

```
src/
├── app/                    # Next.js App Router routes & API handlers
├── components/             # UI components (recipes/, ui/, common/)
├── lib/                    # Utilities and helpers
├── server/                 # Service layer (business logic)
├── store/                  # RecipeStore (React Query provider)
└── types/                  # TypeScript definitions

prisma/                     # Database schema & migrations
docs/                       # Architecture documentation
```

## Key Architectural Patterns

1. **Service Layer Separation:** API routes (`src/app/api/*`) delegate to `src/server/recipesService.ts` for all business logic and database access.
2. **React Query Integration:** All data fetching uses React Query hooks with optimistic updates and cache invalidation.
3. **Component Composition:** Radix UI primitives wrapped in custom components under `src/components/ui/`.
4. **Type Safety:** Strict TypeScript with Prisma-generated types.

## Development Workflow

### Before Making Changes

1. Run quality checks to understand current state:

   ```bash
   npm run lint
   npm run typecheck
   npm run format
   ```

2. Check database schema: `npx prisma studio` or review `prisma/schema.prisma`

3. Review existing patterns in similar components/services before implementing new features

### Code Standards

- **Match existing style:** Check surrounding code for conventions (component structure, naming, imports)
- **Use installed libraries:** Verify packages exist in `package.json` before using
- **Minimal comments:** Only add comments for complex logic, not obvious operations
- **Security:** Never expose secrets, API keys, or sensitive data (check git diffs before commits)

### Testing Requirements

Before completing any task:

```bash
npm run lint          # ESLint checks
npm run typecheck     # TypeScript validation
npm run format        # Prettier formatting
npm run test          # Unit tests (Vitest)
```

Fix all errors before marking work complete.

## Common Tasks

### Database Changes

1. Update `prisma/schema.prisma`
2. Run `npx prisma migrate dev --name descriptive_name`
3. Prisma client auto-generates; use `npx prisma generate` if needed

### Adding API Endpoints

1. Create route handler in `src/app/api/`
2. Implement business logic in `src/server/recipesService.ts`
3. Add React Query hook in `src/store/RecipeStore.tsx` if needed
4. Update types in `src/types/` as necessary

### UI Components

1. Use Radix UI primitives from existing imports
2. Follow Tailwind utility classes for styling
3. Ensure mobile-first responsive design
4. Add to appropriate directory: `components/ui/`, `components/recipes/`, or `components/common/`

## Feature-Specific Notes

### Photo Extraction (Gemini AI)

- Requires `GEMINI_API_KEY` environment variable
- Implementation in `src/server/recipesService.ts` → `extractRecipeFromPhoto()`
- See [Photo Extraction Guide](docs/photo-extraction.md)

### Ingredient Autocomplete

- Uses cached ingredient list from database
- Helper functions in `src/lib/ingredient-helpers.ts`
- Debounced search in ingredient form components

### Version Management

- Recipes support versioning with cloning functionality
- Version comparison views available
- Baker's percentage calculations per version

## Important Files

- `src/server/recipesService.ts` - Core business logic
- `src/store/RecipeStore.tsx` - React Query setup & hooks
- `src/lib/ingredient-helpers.ts` - Ingredient utilities
- `prisma/schema.prisma` - Database schema
- `middleware.ts` - Auth middleware

## Documentation References

For deeper understanding, consult:

- [Architecture](docs/architecture.md) - System design and patterns
- [API Reference](docs/api.md) - Endpoint specifications
- [Data Model](docs/data-model.md) - Database schema details
- [Photo Extraction Guide](docs/photo-extraction.md) - AI integration
- [Deployment Guide](docs/deployment.md) - Production configuration

## Environment Variables

### Development Required

- `DATABASE_URL` - SQLite file path (default: `file:./dev.db`)

### Optional Features

- `GEMINI_API_KEY` - Enable photo-to-recipe extraction
- `RESEND_API_KEY` - Magic link email delivery
- `FROM_EMAIL` - Verified sender address

### Production Critical

- `BETTER_AUTH_URL` - Full production URL (e.g., `https://your-app.vercel.app`)
- `NEXT_PUBLIC_BETTER_AUTH_URL` - Same as above, client-accessible
- `DATABASE_URL` - PostgreSQL connection string

## Git Workflow

### Before Commits

1. Run `git status` and `git diff --cached`
2. Review ALL changes for secrets/credentials
3. Ensure all tests pass
4. Check for unintended file inclusions

### Commit Standards

- Use descriptive messages (see `git log --oneline -5` for style)
- Co-author with Factory bot when applicable
- Never force push without explicit user request

## Troubleshooting

- **Prisma errors:** Run `npx prisma generate` and `npx prisma migrate dev`
- **Type errors:** Check `npx prisma generate` ran successfully
- **Build failures:** Verify all environment variables are set
- **Auth issues:** Confirm `BETTER_AUTH_URL` matches deployment URL

## Performance Considerations

- React Query caching reduces API calls
- Optimistic updates for better UX
- Mobile-first CSS for faster mobile loads
- Ingredient autocomplete is debounced

## Security Notes

- Magic link authentication requires proper URL configuration
- Never commit `.env` file
- Validate all user inputs in API routes
- Sanitize photo extraction responses before storing

---

**Remember:** Always verify changes work as expected. Match existing code patterns. Run all quality checks before completing tasks.
