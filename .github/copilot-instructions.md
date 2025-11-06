# Evalify

## Tools Used

- Nextjs
- tRPC
- Drizzle (ORM)
- minIO (object storage)
- Redis (caching)
- ShandCNUI (UI components)
- Posthog (analytics)

## Instructions

- Use the logger in `src/lib/logger.ts` for logging.
- Use the database instance in `src/db/index.ts` for database operations.
- Do not create `.md` files for every change. Only create documentation files for significant features or modules.
- Follow the existing code style and conventions used in the project.
- Ensure to use the best practices for security, performance, and maintainability while writing code.
- Ensure to use the best practices in file and folder naming conventions.
- Try to use Server components wherever possible unless interactivity is required.
- All pages should be responsive and mobile-friendly.
- Write type-safe code using TypeScript features effectively.
- Ensure to write modular and reusable code.
- Use `src/hooks/use-analytics.ts` for tracking analytics events. do this in all important user interactions.
- Use `src/hooks/use-toast.tsx` for showing toast notifications. handle success and error messages appropriately.
- Handle errors gracefully and provide meaningful feedback to users.
