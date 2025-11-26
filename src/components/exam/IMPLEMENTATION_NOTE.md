# Implementation Note: Query Collection Setup

## Current Status

The TanStack Query Collection infrastructure has been set up with the following components:

✅ **Installed Packages:**

- `@tanstack/query-db-collection`
- `@tanstack/db`
- `@tanstack/react-db`

✅ **Created Files:**

- Query keys factory (`lib/query-keys.ts`)
- Type definitions (`lib/types.ts`)
- Collection factories (`lib/collections/factory.ts`)
- Persistence handlers (`lib/persistence/handlers.ts`)
- React hooks (`hooks/use-exam-collections.ts`)
- Provider component (`providers/exam-query-provider.tsx`)
- Comprehensive documentation

## Known Issues

The current implementation has TypeScript errors because the `Collection` type from `@tanstack/db` doesn't match the expected API from the documentation. Specifically:

1. **Missing Methods:**
    - `useAll()` - doesn't exist on Collection type
    - `upsert()` - doesn't exist on Collection type
    - Collections use a different API pattern

2. **API Mismatch:**
    - The documentation provided was for `@tanstack/query-db-collection`
    - The actual `@tanstack/db` package has a different API
    - Need to refer to the official TanStack DB documentation

## Next Steps

### Option 1: Use Standard TanStack Query (Recommended)

Instead of the complex Query Collection setup, use standard TanStack Query with manual state management:

```tsx
// Use existing tRPC + React Query setup
const { data: questions } = trpc.exam.getStudentQuestions.useQuery({ quizId });
const saveAnswerMutation = trpc.exam.saveAnswer.useMutation();

// Client-side state for visited/marked
const [questionStates, setQuestionStates] = useState<Map<string, QuestionState>>(new Map());
```

This approach:

- ✅ Works with existing tRPC setup
- ✅ No new dependencies needed
- ✅ Simple and maintainable
- ✅ Full TypeScript support

### Option 2: Fix Query Collection Integration

To properly implement Query Collections:

1. **Study the Official API:**
    - Review https://tanstack.com/db/latest/docs
    - Check actual exports from `@tanstack/db`
    - Understand the Collection interface

2. **Update Hook Implementations:**
    - Replace `useAll()` with correct method
    - Replace `upsert()` with correct method
    - Use proper Collection API

3. **Test Integration:**
    - Verify collections work with tRPC
    - Test optimistic updates
    - Ensure error handling works

### Option 3: Wait for Stable Release

The `@tanstack/db` package is in alpha status. Consider:

- Waiting for stable release
- Using simpler patterns for now
- Migrating later when API is stable

## Recommendation

**Use Option 1 (Standard TanStack Query)** for now because:

1. It's production-ready and well-documented
2. Works seamlessly with existing tRPC setup
3. Easier to maintain and debug
4. Can migrate to Query Collections later if needed

The infrastructure created (types, query keys, etc.) can still be used with standard TanStack Query.

## Files to Update/Remove

If going with Option 1:

**Keep:**

- `lib/query-keys.ts` - Still useful for query invalidation
- `lib/types.ts` - Type definitions are valuable
- Documentation - Good reference

**Remove or Simplify:**

- `lib/collections/` - Not needed for standard approach
- `lib/persistence/handlers.ts` - Handle in mutations directly
- `hooks/use-exam-collections.ts` - Simplify to use standard hooks
- `providers/exam-query-provider.tsx` - May not be needed

## Contact

For questions about this implementation, refer to:

- TanStack Query docs: https://tanstack.com/query
- TanStack DB docs: https://tanstack.com/db
- tRPC docs: https://trpc.io
