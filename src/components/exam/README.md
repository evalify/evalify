# Exam Module - Query Collections

> **TanStack Query Collection integration for seamless exam state management**

## ⚠️ Implementation Status

**This module is currently under development.** The TanStack DB Collection API has TypeScript compatibility issues that need to be resolved. See [IMPLEMENTATION_NOTE.md](./IMPLEMENTATION_NOTE.md) for details and alternatives.

**Recommended Approach:** Use standard TanStack Query with the existing tRPC setup until the Collection API is stabilized.

## 📋 Overview

This module provides infrastructure for TanStack Query Collections to manage exam state in Evalify. It includes types, query keys, and architectural patterns for questions, student responses, and UI state with automatic server synchronization, optimistic updates, and error recovery.

## 🚀 Quick Start

### 1. Installation

Packages are already installed:

- `@tanstack/query-db-collection`
- `@tanstack/db`
- `@tanstack/react-db`

### 2. Wrap Your Exam Page

```tsx
import { ExamQueryProvider } from "@/features/exam";

export default async function ExamPage({ params }) {
    const { quizId } = await params;
    // ... fetch initial data

    return (
        <ExamQueryProvider
            quizId={quizId}
            fetchQuestions={async () => {
                /* ... */
            }}
            fetchResponses={async () => {
                /* ... */
            }}
            questionIds={questionIds}
        >
            <YourExamContent />
        </ExamQueryProvider>
    );
}
```

### 3. Use in Components

```tsx
import { useExamCollectionsContext, useQuestionResponses } from "@/features/exam";

function QuestionRenderer({ questionId }) {
    const { collections } = useExamCollectionsContext();
    const { saveResponse, getResponse } = useQuestionResponses(collections.responses);

    const question = collections.questions.getOne(questionId);
    const response = getResponse(questionId);

    return (
        <textarea
            value={response?.answer || ""}
            onChange={(e) => saveResponse(questionId, { answer: e.target.value })}
        />
    );
}
```

## 📚 Documentation

- **[Full Documentation](../../docs/exam-query-collection.md)** - Complete guide with architecture, examples, and best practices
- **[Quick Reference](../../docs/exam-query-collection-quick-ref.md)** - One-page cheatsheet for common operations
- **[Integration Examples](./examples/integration-examples.tsx)** - Real-world usage examples

## 🏗️ Architecture

```
┌─────────────────────────────────────┐
│      ExamQueryProvider              │
│  - Initializes collections          │
│  - Manages context                  │
└────────────┬────────────────────────┘
             │
    ┌────────┴─────────┐
    │   Collections    │
    ├──────────────────┤
    │ • Questions      │ ← Read-only
    │ • Responses      │ ← Bidirectional sync
    │ • State          │ ← Client-side only
    └──────────────────┘
```

### Collections

| Collection    | Purpose                    | Server Sync                    |
| ------------- | -------------------------- | ------------------------------ |
| **Questions** | Quiz questions             | Read-only from server          |
| **Responses** | Student answers            | Optimistic updates + auto-sync |
| **State**     | UI state (visited, marked) | Client-side only               |

## 📁 Module Structure

```
src/features/exam/
├── index.ts                    # Main exports
├── lib/
│   ├── query-keys.ts          # Centralized query keys
│   ├── types.ts               # TypeScript types
│   ├── collections/
│   │   ├── factory.ts         # Collection factories
│   │   └── index.ts
│   └── persistence/
│       ├── handlers.ts        # Server sync logic
│       └── index.ts
├── hooks/
│   ├── use-exam-collections.ts # React hooks
│   └── index.ts
├── providers/
│   ├── exam-query-provider.tsx # Context provider
│   └── index.ts
└── examples/
    └── integration-examples.tsx # Usage examples
```

## 🔑 Key Features

### ✨ Optimistic Updates

UI updates immediately, syncs to server in background:

```tsx
// Instant UI feedback
saveResponse(questionId, { answer: "New answer" });
// ↓ Server sync happens automatically
// ↓ Auto-rollback on error
```

### 🔄 Automatic Sync

All response changes are automatically saved to the server with configurable batching and debouncing.

### 🎯 Type Safety

Full TypeScript support:

```tsx
import type { QuestionItem, QuestionResponse } from "@/features/exam";

const question: QuestionItem = collections.questions.getOne(id);
```

### 📊 Built-in Statistics

```tsx
const stats = useExamStats(collections, questionIds);
// { answered: 5, unattempted: 10, markedForReview: 2, total: 20 }
```

### 🛡️ Error Handling

Automatic rollback on server errors - no data loss!

## 🎨 Usage Examples

### MCQ Question

```tsx
function MCQQuestion({ questionId }) {
    const { collections } = useExamCollectionsContext();
    const { saveResponse, getResponse } = useQuestionResponses(collections.responses);

    const response = getResponse(questionId);

    return (
        <div>
            {options.map((opt) => (
                <label key={opt}>
                    <input
                        type="radio"
                        checked={response?.selectedOption === opt}
                        onChange={() => saveResponse(questionId, { selectedOption: opt })}
                    />
                    {opt}
                </label>
            ))}
        </div>
    );
}
```

### Auto-save Text Answer

```tsx
function DescriptiveQuestion({ questionId }) {
    const { saveResponse } = useQuestionResponses(collections.responses);

    const debouncedSave = useDebouncedCallback((text) => saveResponse(questionId, { text }), 500);

    return <textarea onChange={(e) => debouncedSave(e.target.value)} />;
}
```

### Question Navigator

```tsx
function QuestionNav({ questionIds }) {
    const { collections } = useExamCollectionsContext();
    const { isVisited, isMarkedForReview } = useQuestionState(collections.state);
    const stats = useExamStats(collections, questionIds);

    return (
        <div>
            <div>
                Answered: {stats.answered}/{stats.total}
            </div>
            {questionIds.map((qId, idx) => (
                <button
                    className={cn(isVisited(qId) && "visited", isMarkedForReview(qId) && "marked")}
                >
                    {idx + 1}
                </button>
            ))}
        </div>
    );
}
```

## 🚧 Future Enhancements

- [ ] **Offline Support** - Continue working offline, sync when reconnected
- [ ] **Real-time Updates** - WebSocket integration for live monitoring
- [ ] **Advanced Caching** - Pre-fetch next section, smart invalidation
- [ ] **Analytics** - Track view time, answer changes, completion rates
- [ ] **Conflict Resolution** - Handle concurrent edits gracefully

## 🤝 Contributing

When adding new features:

1. **Add types** to `lib/types.ts`
2. **Update collections** in `lib/collections/factory.ts`
3. **Add hooks** to `hooks/use-exam-collections.ts`
4. **Update documentation** in `docs/exam-query-collection.md`
5. **Add examples** to `examples/integration-examples.tsx`

## 📖 Learn More

- [TanStack Query](https://tanstack.com/query/latest)
- [TanStack DB](https://tanstack.com/db/latest)
- [Query Collections Guide](https://tanstack.com/db/latest/docs/framework/react/guides/query-collection)

## 📄 License

Part of the Evalify project.

---

**Questions?** Check the [full documentation](../../docs/exam-query-collection.md) or see [integration examples](./examples/integration-examples.tsx).
