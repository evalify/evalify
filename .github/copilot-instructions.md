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
- properly document complex functions and components with comments.
- properly give informative messages in the UI for better user experience. you can add tooltips where necessary.
- Always Use shadcn/ui components for building the UI. follow the design system.
- Use lucide icons from `lucide-react` package for icons in the UI.
- Make sure UI works well in both light and dark modes.
- use `src/components/ui/custom-alert-dialog.tsx` for alert dialogs.
- security is important. make sure to validate and sanitize user inputs properly.
- Make sure every necessary thing is validated on both client and server sides.

## Project Directory & Code Structure Guidelines (Target Architecture)

> The repository still contains some legacy, type-based folders (for example `src/components/question/*`). These guidelines describe the **target** structure. When touching any area, prefer organizing new files according to this guide so the ongoing refactor stays consistent.

### 1. Core Philosophy: Feature-First Domains

- Organize code by **feature or domain** instead of by type. Everything specific to Question Bank work should live under `src/features/question-bank`, Quiz logic under `src/features/quiz`, etc.
- Server actions, hooks, and UI that only make sense for a feature stay inside that feature folder.
- Benefits: each domain becomes self-contained, onboarding is faster, and future refactors are mostly copy/move operations.

### 2. Directory Overview (Rooted at `evalify/`)

```
evalify/
├── src/
│   ├── app/                    <-- (1) Routing + initial data fetching
│   ├── components/             <-- (2) Shared UI only (shadcn + global layout)
│   │   ├── ui/                 <-- shadcn primitives managed via CLI
│   │   ├── layout/             <-- Site shell pieces (SideNav, PageShell)
│   │   └── shared/             <-- Dumb, reusable bits (Logo, ThemeToggle)
│   ├── features/               <-- (3) Business logic per domain (target)
│   │   ├── auth/
│   │   │   ├── components/
│   │   │   ├── actions/
│   │   │   └── hooks/
│   │   └── question-bank/
│   │       ├── components/
│   │       ├── hooks/
│   │       └── server/
│   ├── hooks/                  <-- Truly cross-feature hooks (use-mobile, analytics)
│   ├── lib/                    <-- Utilities, SDK clients, logger, db and storage
│   ├── server/                 <-- tRPC routers, procedures, adapters
│   └── types/                  <-- Global TypeScript contracts
├── components.json             <-- shadcn config
├── drizzle.config.ts           <-- Drizzle migrations config
├── next.config.ts
└── package.json / pnpm-lock.yaml
```

When moving existing code, mirror this hierarchy but keep imports stable via `@/` aliases.

### 3. Dependency Rules (One-Way Flow)

1. `src/app`
    - **Purpose:** Routing, server components, and data fetching. Keep `page.tsx` files thin; delegate to feature components.
    - **May import from:** `src/features/*`, `src/components/layout`, `src/components/shared`, and low-level utilities (`src/lib`, `src/types`).
    - **Never import from:** `src/components/ui` directly unless you are creating a very small page-level wrapper; prefer feature abstractions.

2. `src/features/*`
    - **Purpose:** Business logic, orchestrating UI + data for a domain.
    - **May import from:** `src/components/ui`, `src/components/shared`, `src/hooks` (cross-feature), `src/lib`, `src/server`, `src/types`.
    - **Must not import:** Another feature folder. Shared logic should be hoisted to `src/hooks` or `src/lib`.
    - **Tip:** Create sub-folders such as `components`, `hooks`, `actions`, `services`, `schema` inside each feature to keep large domains manageable.

3. `src/components`
    - **Purpose:** Pure presentation; no business rules.
    - `components/ui` stays CLI-managed; do not hand-edit generated primitives.
    - `components/layout` and `components/shared` can depend on `src/lib` and `src/types`, but **must never pull from `src/features` or `src/server`**.

4. `src/lib`
    - **Purpose:** Lowest layer (logger, storage client, auth helpers, schema validators, PostHog helpers).
    - **Rule:** `src/lib` cannot depend on `src/app`, `src/features`, or `src/components`. Keep it pure so utilities are importable anywhere.

5. Cross-cutting folders
    - `src/hooks`: only hooks that are genuinely reused by multiple features (e.g., `use-analytics`, `use-toast`, `use-mobile`). If a hook is feature-specific, place it under that feature.
    - `src/server`: tRPC routers and server adapters that can be imported by features. They may depend on `src/lib` but not on UI.
    - `src/types`: colocate shared types or re-export Drizzle types that are needed across layers.

### 4. Working Within the Current (Legacy) Layout

- When editing pre-existing folders (like `src/components/question`), do not reshuffle everything mid-task. Instead, follow these rules for **new** files and gradually move old ones when you are already touching them.
- If a file currently violates the dependency flow, note it in the PR description and leave a `TODO` inside the file describing the intended target location.
- Prefer creating a parallel feature folder (`src/features/question-bank`) and migrate piece-by-piece, wiring the `app` route to the new feature component once it is stable.

### 5. Workflow for Adding a New Feature (Example: "Instructor Analytics")

1. **Create/Update the Route** under `src/app/(dashboard)/analytics/page.tsx`. Keep it thin—render a feature component and handle loading states.
2. **Create the Feature Folder** at `src/features/analytics` with sub-folders as needed (`components`, `hooks`, `actions`, `server`).
3. **Install UI Primitives** via shadcn CLI (e.g., cards, charts). Generated files land in `src/components/ui`.
4. **Build Feature Components** inside the feature folder, importing primitives (`@/components/ui/card`) and shared helpers (`@/hooks/use-analytics`).
5. **Wire Data + Server Logic** using `src/server/trpc` procedures or dedicated server actions placed under the feature's `server/` or `actions/` directories.
6. **Connect the Route** by importing from `@/features/analytics/components/analytics-overview` inside the page file.
7. **Track + Notify:** For every key interaction, call `useAnalytics().track(...)` and surface user feedback with `useToast()`.

### 6. Quick Reference Checklist

- [ ] Is the file placed inside the correct feature folder?
- [ ] Does the file import only from allowed layers?
- [ ] Are shared bits extracted into `src/components/shared`, `src/hooks`, or `src/lib`?
- [ ] Did you avoid touching `components/ui` manually?
- [ ] Did you document complex flows and add TODOs where migration is pending?

Following this structure now—even while the repo is mid-refactor—ensures the eventual cleanup is straightforward and Copilot suggestions stay on track.
