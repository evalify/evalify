"use client";

import { trpc } from "@/lib/trpc/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, CheckCircle2, Loader2 } from "lucide-react";

/**
 * Example component demonstrating tRPC usage with RBAC
 * This shows how to make queries and mutations with proper error handling
 */
export function TRPCExampleComponent() {
    // Query example - Get current user
    const { data: user, isLoading: userLoading, error: userError } = trpc.auth.getUser.useQuery();

    // Query example - List courses
    const {
        data: coursesData,
        isLoading: coursesLoading,
        refetch: refetchCourses,
    } = trpc.course.list.useQuery({
        limit: 10,
        offset: 0,
    });

    // Mutation example - Update profile
    const updateProfile = trpc.user.updateMyProfile.useMutation({
        onSuccess: () => {
            console.log("Profile updated successfully!");
        },
        onError: (error) => {
            if (error.data?.code === "FORBIDDEN") {
                console.error("You don't have permission to update profile");
            } else if (error.data?.code === "UNAUTHORIZED") {
                console.error("Please log in first");
            } else {
                console.error("Failed to update profile:", error.message);
            }
        },
    });

    // Mutation example - Create course (Admin/Faculty only)
    const createCourse = trpc.course.create.useMutation({
        onSuccess: () => {
            console.log("Course created successfully!");
            // Refetch courses list
            refetchCourses();
        },
        onError: (error) => {
            console.error("Failed to create course:", error.message);
        },
    });

    // Handle user query loading state
    if (userLoading) {
        return (
            <Card>
                <CardContent className="flex items-center justify-center p-6">
                    <Loader2 className="h-6 w-6 animate-spin" />
                    <span className="ml-2">Loading user data...</span>
                </CardContent>
            </Card>
        );
    }

    // Handle user query error
    if (userError) {
        return (
            <Card>
                <CardContent className="p-6">
                    <Alert variant="destructive">
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>
                            {userError.data?.code === "UNAUTHORIZED"
                                ? "Please log in to view this content"
                                : `Error: ${userError.message}`}
                        </AlertDescription>
                    </Alert>
                </CardContent>
            </Card>
        );
    }

    return (
        <div className="space-y-4">
            {/* User Information */}
            <Card>
                <CardHeader>
                    <CardTitle>User Profile</CardTitle>
                    <CardDescription>Your current session information</CardDescription>
                </CardHeader>
                <CardContent className="space-y-2">
                    <div>
                        <strong>Name:</strong> {user?.name || "N/A"}
                    </div>
                    <div>
                        <strong>Email:</strong> {user?.email || "N/A"}
                    </div>
                    <div>
                        <strong>Roles:</strong> {user?.roles.join(", ") || "None"}
                    </div>
                    <div>
                        <strong>Groups:</strong> {user?.groups.join(", ") || "None"}
                    </div>

                    <Button
                        onClick={() =>
                            updateProfile.mutate({
                                name: "Updated Name",
                            })
                        }
                        disabled={updateProfile.isPending}
                    >
                        {updateProfile.isPending ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Updating...
                            </>
                        ) : (
                            "Update Profile"
                        )}
                    </Button>

                    {updateProfile.isSuccess && (
                        <Alert>
                            <CheckCircle2 className="h-4 w-4" />
                            <AlertDescription>Profile updated successfully!</AlertDescription>
                        </Alert>
                    )}

                    {updateProfile.error && (
                        <Alert variant="destructive">
                            <AlertCircle className="h-4 w-4" />
                            <AlertDescription>{updateProfile.error.message}</AlertDescription>
                        </Alert>
                    )}
                </CardContent>
            </Card>

            {/* Courses List */}
            <Card>
                <CardHeader>
                    <CardTitle>Courses</CardTitle>
                    <CardDescription>Available courses in the system</CardDescription>
                </CardHeader>
                <CardContent>
                    {coursesLoading ? (
                        <div className="flex items-center">
                            <Loader2 className="h-4 w-4 animate-spin mr-2" />
                            Loading courses...
                        </div>
                    ) : coursesData?.courses && coursesData.courses.length > 0 ? (
                        <div className="space-y-2">
                            {coursesData.courses.map((course) => (
                                <div key={course.id} className="p-2 border rounded">
                                    <div>
                                        <strong>{course.name}</strong>
                                    </div>
                                    <div className="text-sm text-muted-foreground">
                                        Code: {course.code}
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="text-muted-foreground">No courses found</div>
                    )}
                </CardContent>
            </Card>

            {/* Create Course (Admin/Faculty only) */}
            {user?.roles.includes("admin") || user?.roles.includes("faculty") ? (
                <Card>
                    <CardHeader>
                        <CardTitle>Create Course</CardTitle>
                        <CardDescription>Admin and Faculty can create new courses</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Button
                            onClick={() =>
                                createCourse.mutate({
                                    name: "Introduction to Computer Science",
                                    code: "CS101",
                                    description: "An introductory course to computer science",
                                    semesterId: 1,
                                })
                            }
                            disabled={createCourse.isPending}
                        >
                            {createCourse.isPending ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Creating...
                                </>
                            ) : (
                                "Create Sample Course"
                            )}
                        </Button>

                        {createCourse.isSuccess && (
                            <Alert className="mt-4">
                                <CheckCircle2 className="h-4 w-4" />
                                <AlertDescription>Course created successfully!</AlertDescription>
                            </Alert>
                        )}

                        {createCourse.error && (
                            <Alert variant="destructive" className="mt-4">
                                <AlertCircle className="h-4 w-4" />
                                <AlertDescription>
                                    {createCourse.error.data?.code === "FORBIDDEN"
                                        ? "You don't have permission to create courses"
                                        : createCourse.error.message}
                                </AlertDescription>
                            </Alert>
                        )}
                    </CardContent>
                </Card>
            ) : (
                <Card>
                    <CardContent className="p-6">
                        <Alert>
                            <AlertDescription>
                                You need Admin or Faculty role to create courses.
                            </AlertDescription>
                        </Alert>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
