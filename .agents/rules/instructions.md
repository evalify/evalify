---
trigger: always_on
---

# Evalify

## Tools Used

- Nextjs
- tRPC
- Drizzle (ORM)
- minIO (object storage)
- Redis (caching)
- shadcn/ui (UI components)
- Posthog (analytics)

## Instructions

- Prefer `bun` as the package manager.
- Log via the logger in `src/lib/logger.ts`.
- Access the database through the instance exported by `src/db/index.ts`.
- Only create `.md` documentation for significant features or modules.
- Adhere to the project's existing code style and conventions.
- Ensure to use the best practices for security, performance, and maintainability while writing code.
- Ensure to use the best practices in file and folder naming conventions.
- Try to use Server components wherever possible unless interactivity is required.
- All pages should be responsive and mobile-friendly.
- Write type-safe code using TypeScript features effectively.
- Ensure to write modular and reusable code.
- Use `src/hooks/use-analytics.ts` for tracking analytics events. do this in all important user interactions.
- Use `src/hooks/use-toast.tsx` for showing toast notifications. handle success and error messages appropriately.
- Handle errors gracefully and provide meaningful feedback to users.
- properly document complex functions and components with comments.
- properly give informative messages in the UI for better user experience. you can add tooltips where necessary.
- Always Use shadcn/ui components for building the UI. follow the design system.
- Use lucide icons from `lucide-react` package for icons in the UI.
- Make sure UI works well in both light and dark modes.
- use `src/components/ui/custom-alert-dialog.tsx` for alert dialogs.
- security is important. make sure to validate and sanitize user inputs properly.
- Make sure every necessary thing is validated on both client and server sides.
- Use `shadCN/ui` MCP to write UI components.
- Use `useMemo` and `useCallback` hooks to optimize performance only when it is necessary.
