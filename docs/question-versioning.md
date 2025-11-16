# Question Versioning System

## Overview

The Evalify question system now supports granular versioning for both question data and solutions. This allows for independent evolution of question structure and answer formats without breaking backward compatibility.

## Architecture

### Versioned Structure

Each question type (MCQ, MMCQ, etc.) now stores its data and solution in a versioned format:

```typescript
interface VersionedJson<T> {
    version: number;
    data: T;
}
```

### Current Implementation Status

**✅ Implemented:**

- MCQ (Multiple Choice Question) - separate data & solution versioning
- MMCQ (Multiple Multiple Choice Question) - separate data & solution versioning
- TRUE_FALSE - solution versioning ready
- FILL_THE_BLANK - config versioning ready

**⏳ To be Implemented:**

- MATCHING
- DESCRIPTIVE
- CODING
- FILE_UPLOAD

## Question Type Structure

### MCQ & MMCQ

**Question Data (v1):**

```typescript
{
    version: 1,
    data: {
        options: [
            {
                id: string,
                optionText: string,
                orderIndex: number
            }
        ]
    }
}
```

**Solution Data (v1):**

```typescript
{
    version: 1,
    data: {
        correctOptions: [
            {
                id: string,
                isCorrect: boolean
            }
        ]
    }
}
```

### TRUE_FALSE

TRUE_FALSE questions store the answer directly in the question object:

```typescript
{
    type: "TRUE_FALSE",
    trueFalseAnswer: boolean,
    // other common fields...
}
```

**Versioned Solution (for storage):**

```typescript
{
    version: 1,
    data: {
        trueFalseAnswer: boolean
    }
}
```

### FILL_THE_BLANK

FILL_THE_BLANK questions store configuration directly:

```typescript
{
    type: "FILL_THE_BLANK",
    blankConfig: {
        blankCount: number,
        acceptableAnswers: Record<number, { answers: string[], type: string }>,
        blankWeights: Record<number, number>,
        evaluationType: string
    },
    // other common fields...
}
```

**Versioned Config (for storage):**

```typescript
{
    version: 1,
    data: {
        blankCount: number,
        acceptableAnswers: { ... },
        blankWeights: { ... },
        evaluationType: string
    }
}
```

## Version Management

### Current Versions

All question types currently use version 1 for both data and solution:

```typescript
const QUESTION_VERSIONS = {
    MCQ: { DATA: 1, SOLUTION: 1 },
    MMCQ: { DATA: 1, SOLUTION: 1 },
    // ... other types
};
```

### Adding New Versions

When introducing breaking changes:

1. **Increment the version number**

    ```typescript
    MCQ: { DATA: 2, SOLUTION: 1 }
    ```

2. **Update the type definitions** in `src/types/questions.ts`

3. **Implement migration logic** in `src/lib/versioning/question-versioning.ts`

4. **Update the backend schemas** in `src/server/trpc/routers/academic/faculty/question.ts`

5. **Update validation logic** in `src/components/question/question-validator.ts`

## Benefits

### 1. **Granular Control**

- Independent versioning for question data and solutions
- Different question types can evolve at different rates

### 2. **Backward Compatibility**

- Old questions continue to work with new code
- Migration paths can be implemented gradually

### 3. **Future-Proof**

- Easy to add new fields or change structure
- Version-specific logic can be implemented as needed

### 4. **Audit Trail**

- Version numbers provide clear indication of schema changes
- Helps with debugging and data analysis

## Usage Examples

### Creating a New Question

```typescript
import { createDefaultQuestion } from "@/components/question/question-factory";
import { QuestionType } from "@/types/questions";

// MCQ - no changes needed in components
const newMCQ = createDefaultQuestion(QuestionType.MCQ);
// Result: { questionData: { options: [] }, solution: { correctOptions: [] }, ... }

// TRUE_FALSE - stores answer directly
const newTF = createDefaultQuestion(QuestionType.TRUE_FALSE);
// Result: { trueFalseAnswer: undefined, ... }

// FILL_THE_BLANK - stores config directly
const newFIB = createDefaultQuestion(QuestionType.FILL_THE_BLANK);
// Result: { blankConfig: { blankCount: 0, ... }, ... }
```

### Using Versioning Utilities (for storage/backend)

```typescript
import {
    versionMCQData,
    versionMCQSolution,
    versionTrueFalseSolution,
    versionFillInBlanksConfig,
    unwrapVersion
} from "@/lib/versioning/question-versioning";

// When saving to database - wrap with version
const versionedData = versionMCQData({ options: [...] });
// Result: { version: 1, data: { options: [...] } }

const versionedSolution = versionMCQSolution({ correctOptions: [...] });
// Result: { version: 1, data: { correctOptions: [...] } }

// TRUE_FALSE
const tfSolution = versionTrueFalseSolution({ trueFalseAnswer: true });
// Result: { version: 1, data: { trueFalseAnswer: true } }

// FILL_THE_BLANK
const fibConfig = versionFillInBlanksConfig({ blankCount: 2, ... });
// Result: { version: 1, data: { blankCount: 2, ... } }

// When loading from database - unwrap version
const rawData = unwrapVersion(versionedData);
// Result: { options: [...] }
```

## Migration Strategy

### When to Migrate

Migrations should be implemented when:

- Field names change
- Data structure changes significantly
- Required fields are added
- Data types change

### How to Implement Migration

1. **Define the new schema** (e.g., v2)
2. **Create migration function**:
    ```typescript
    function migrateV1ToV2(v1Data: V1Schema): V2Schema {
        return {
            // Transform data
        };
    }
    ```
3. **Update `migrateQuestionData` function** in version utilities
4. **Test thoroughly** with old data

## Database Storage

Questions are stored in the `questions` table with `questionData` and `solution` as JSONB columns. The versioned structure is preserved:

```sql
-- Example storage
{
    "questionData": {
        "version": 1,
        "data": { ... }
    },
    "solution": {
        "version": 1,
        "data": { ... }
    }
}
```

## Best Practices

1. **Always use version utilities** when working with versioned data
2. **Document version changes** in this file
3. **Test migrations** with real data before deploying
4. **Keep old version support** for at least one major release
5. **Version numbers are immutable** - never change data structure for existing versions

## Future Enhancements

### Planned Features

- [ ] Automated migration on data load
- [ ] Version compatibility checks
- [ ] Schema validation per version
- [ ] Version history tracking
- [ ] Rollback capabilities

### Version Roadmap

- **v1.0** (Current): Initial versioning implementation for MCQ/MMCQ
- **v1.1** (Next): Extend versioning to all question types
- **v2.0** (Future): Enhanced question features with new schema

## FAQ

### Q: Why separate versions for data and solution?

**A:** Question content (data) and answer format (solution) may evolve independently. For example, you might add rich media support to questions without changing how answers are structured.

### Q: What happens to old questions when versions change?

**A:** Old questions retain their original version numbers. Migration happens on-demand or can be batch processed.

### Q: Can I query by version in the database?

**A:** Yes, you can use JSONB queries:

```sql
SELECT * FROM questions
WHERE questionData->>'version' = '1';
```

### Q: How do I know which version a question uses?

**A:** Check `question.questionData.version` and `question.solution.version` properties.

## Related Files

- `src/types/questions.ts` - Type definitions
- `src/lib/versioning/question-versioning.ts` - Version utilities
- `src/components/question/question-factory.ts` - Question creation
- `src/components/question/question-validator.ts` - Validation
- `src/server/trpc/routers/academic/faculty/question.ts` - Backend API
- `src/db/schema/question/question.ts` - Database schema
