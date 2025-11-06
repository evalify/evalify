# tRPC Backend with RBAC

This directory contains the tRPC backend setup with Role-Based Access Control (RBAC) integrated with Keycloak authentication.

## Structure

```
src/server/trpc/
├── context.ts         # Creates tRPC context with session
├── trpc.ts            # tRPC initialization and RBAC middleware
├── root.ts            # Root router combining all routers
├── server.ts          # Server-side tRPC caller
└── routers/
    ├── auth.ts        # Authentication endpoints
    ├── user.ts        # User management with RBAC examples
    └── course.ts      # Course management with RBAC examples
```

## Security Features

### 1. **Session-Based Authentication**

- All protected endpoints validate Keycloak session
- Automatic token refresh handling
- Session expiry checks

### 2. **Role-Based Access Control (RBAC)**

- `publicProcedure` - No authentication required
- `protectedProcedure` - Requires authentication
- `adminProcedure` - Admin role only
- `facultyProcedure` - Faculty/Staff role only
- `managerProcedure` - Manager role only
- `studentProcedure` - Student role only
- `createCustomProcedure(roles, groups)` - Custom role/group combinations

### 3. **Group-Based Access**

- Supports Keycloak group membership
- Can combine role + group requirements
- Fine-grained access control per department/batch

## Usage Examples

### Client-Side (React Components)

```tsx
"use client";

import { trpc } from "@/lib/trpc/client";

export function UserProfile() {
    // Query example
    const { data: user, isLoading } = trpc.auth.getUser.useQuery();

    // Mutation example
    const updateProfile = trpc.user.updateMyProfile.useMutation({
        onSuccess: () => {
            console.log("Profile updated!");
        },
    });

    if (isLoading) return <div>Loading...</div>;

    return (
        <div>
            <h1>{user?.name}</h1>
            <button onClick={() => updateProfile.mutate({ name: "New Name" })}>
                Update Profile
            </button>
        </div>
    );
}
```

### Server-Side (Server Components)

```tsx
import { serverTRPC } from "@/server/trpc/server";

export default async function ServerPage() {
    const caller = await serverTRPC();

    try {
        const user = await caller.auth.getUser();
        return <div>Hello {user.name}</div>;
    } catch (error) {
        return <div>Not authenticated</div>;
    }
}
```

### Server Actions

```tsx
"use server";

import { serverTRPC } from "@/server/trpc/server";

export async function gradeStudent(studentId: string, grade: number) {
    const caller = await serverTRPC();

    return await caller.user.gradeStudent({
        studentId,
        courseId: "course-123",
        grade,
    });
}
```

## Creating New Routers

### 1. Create a new router file

```typescript
// src/server/trpc/routers/quiz.ts
import { z } from "zod";
import { createTRPCRouter, protectedProcedure, facultyProcedure } from "../trpc";

export const quizRouter = createTRPCRouter({
    // Any authenticated user can list quizzes
    list: protectedProcedure.input(z.object({ courseId: z.string() })).query(async ({ input }) => {
        // Implementation
        return { quizzes: [] };
    }),

    // Only faculty can create quizzes
    create: facultyProcedure
        .input(
            z.object({
                title: z.string(),
                courseId: z.string(),
                questions: z.array(z.string()),
            })
        )
        .mutation(async ({ ctx, input }) => {
            // Implementation
            return { success: true };
        }),
});
```

### 2. Add to root router

```typescript
// src/server/trpc/root.ts
import { quizRouter } from "./routers/quiz";

export const appRouter = createTRPCRouter({
    auth: authRouter,
    user: userRouter,
    course: courseRouter,
    quiz: quizRouter, // Add new router
});
```

## RBAC Patterns

### Pattern 1: Role-Only Access

```typescript
// Only admins can access
export const deleteAll = adminProcedure.mutation(async () => {
    // Implementation
});
```

### Pattern 2: Multiple Roles

```typescript
// Admins or faculty can access
export const create = createCustomProcedure([UserType.ADMIN, UserType.STAFF])
    .input(schema)
    .mutation(async ({ ctx, input }) => {
        // Implementation
    });
```

### Pattern 3: Role + Group

```typescript
// Faculty from CS department only
export const manageCSDepartment = createCustomProcedure([UserType.STAFF], ["department-cs"]).query(
    async ({ ctx }) => {
        // Implementation
    }
);
```

### Pattern 4: Dynamic Group Check

```typescript
// Check groups dynamically in the procedure
export const manage = facultyProcedure
    .input(z.object({ departmentId: z.string() }))
    .query(async ({ ctx, input }) => {
        const userGroups = ctx.session.user.groups;
        const hasAccess = userGroups.some((group) => group === `department-${input.departmentId}`);

        if (!hasAccess) {
            throw new TRPCError({
                code: "FORBIDDEN",
                message: "No access to this department",
            });
        }

        // Implementation
    });
```

## Error Handling

tRPC errors are automatically typed and handled:

```tsx
const mutation = trpc.user.delete.useMutation({
    onError: (error) => {
        if (error.data?.code === "UNAUTHORIZED") {
            // Redirect to login
        } else if (error.data?.code === "FORBIDDEN") {
            // Show access denied message
        } else {
            // Show generic error
        }
    },
});
```

## Logging

All RBAC checks are logged using the logger:

```typescript
// Successful access
logger.info({ userId, roles, groups }, "Access granted");

// Failed access
logger.warn({ userId, requiredRoles, requiredGroups }, "Access denied");
```

## Testing RBAC

You can test role/group checks:

```tsx
const { data } = trpc.auth.hasRoles.useQuery({
    roles: ["admin", "faculty"],
});

const { data: groupCheck } = trpc.auth.hasGroups.useQuery({
    groups: ["department-cs", "batch-2024"],
});
```

## Best Practices

1. **Always use typed inputs with Zod schemas**
2. **Log security events (access grants/denials)**
3. **Use specific error messages for better debugging**
4. **Keep RBAC logic in middleware, not in procedure implementations**
5. **Use custom procedures for complex role+group combinations**
6. **Test with different user roles/groups during development**

## Environment Variables

Make sure these are set in your `.env`:

```env
AUTH_KEYCLOAK_ID=your-keycloak-client-id
AUTH_KEYCLOAK_SECRET=your-keycloak-client-secret
AUTH_KEYCLOAK_ISSUER=https://your-keycloak-server/realms/your-realm
NEXTAUTH_SECRET=your-nextauth-secret
```
