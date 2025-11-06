"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc/client";
import { useToast } from "@/hooks/use-toast";
import { useAnalytics } from "@/hooks/use-analytics";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { UserCheck, Plus, X, Search, AlertTriangle } from "lucide-react";

interface CourseInstructorsModalProps {
    courseId: number;
    onClose: () => void;
}

export function CourseInstructorsModal({ courseId, onClose }: CourseInstructorsModalProps) {
    const [searchTerm, setSearchTerm] = useState("");
    const [isLoading, setIsLoading] = useState(false);

    const { track } = useAnalytics();
    const { success, error } = useToast();

    // Queries
    const { data: instructorsData, isLoading: loadingInstructors } =
        trpc.course.getInstructors.useQuery({
            courseId,
        });

    const { data: availableData } = trpc.course.getAvailableFaculty.useQuery({
        courseId,
        searchTerm: searchTerm || undefined,
    });

    const instructors = instructorsData || [];
    const availableFaculty = availableData || [];

    // Mutations
    const utils = trpc.useUtils();
    const addInstructor = trpc.course.addInstructor.useMutation({
        onSuccess: () => {
            utils.course.getInstructors.invalidate({ courseId });
            utils.course.getAvailableFaculty.invalidate({ courseId });
            success("Instructor added to course successfully");
        },
        onError: (err) => {
            console.error("Add instructor error:", err);
            error(err.message || "Failed to add instructor to course");
        },
    });

    const removeInstructor = trpc.course.removeInstructor.useMutation({
        onSuccess: () => {
            utils.course.getInstructors.invalidate({ courseId });
            utils.course.getAvailableFaculty.invalidate({ courseId });
            success("Instructor removed from course successfully");
        },
        onError: (err) => {
            console.error("Remove instructor error:", err);
            error(err.message || "Failed to remove instructor from course");
        },
    });

    const handleAddInstructor = async (instructorId: number) => {
        setIsLoading(true);
        try {
            await addInstructor.mutateAsync({ courseId, instructorId });
            track("course_instructor_added", { courseId, instructorId });
        } finally {
            setIsLoading(false);
        }
    };

    const handleRemoveInstructor = async (instructorId: number) => {
        if (confirm("Are you sure you want to remove this instructor from the course?")) {
            setIsLoading(true);
            try {
                await removeInstructor.mutateAsync({ courseId, instructorId });
                track("course_instructor_removed", { courseId, instructorId });
            } finally {
                setIsLoading(false);
            }
        }
    };

    return (
        <div className="space-y-6">
            {/* Current Instructors */}
            <Card>
                <CardHeader>
                    <div className="flex items-center gap-2">
                        <UserCheck className="h-5 w-5" />
                        <h3 className="text-lg font-semibold">Current Instructors</h3>
                    </div>
                    <p className="text-sm text-muted-foreground">
                        {instructors.length} instructor{instructors.length !== 1 ? "s" : ""}{" "}
                        assigned
                    </p>
                </CardHeader>
                <CardContent>
                    {loadingInstructors ? (
                        <p className="text-sm text-muted-foreground">Loading instructors...</p>
                    ) : instructors.length === 0 ? (
                        <Alert>
                            <AlertTriangle className="h-4 w-4" />
                            <AlertDescription>
                                No instructors are currently assigned to this course.
                            </AlertDescription>
                        </Alert>
                    ) : (
                        <div className="space-y-3">
                            {instructors.map((instructor) => (
                                <div
                                    key={instructor.id}
                                    className="flex items-center justify-between p-3 border rounded-lg"
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-900">
                                            <UserCheck className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                                        </div>
                                        <div>
                                            <div className="font-medium text-gray-900 dark:text-gray-100">
                                                {instructor.name}
                                            </div>
                                            <div className="text-sm text-gray-500 dark:text-gray-400">
                                                {instructor.email} • {instructor.profileId}
                                            </div>
                                        </div>
                                    </div>
                                    <Button
                                        onClick={() => handleRemoveInstructor(instructor.id)}
                                        variant="outline"
                                        size="sm"
                                        disabled={isLoading}
                                        className="text-red-600 hover:text-red-700"
                                    >
                                        <X className="h-4 w-4" />
                                    </Button>
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Add New Instructors */}
            <Card>
                <CardHeader>
                    <div className="flex items-center gap-2">
                        <Plus className="h-5 w-5" />
                        <h3 className="text-lg font-semibold">Add Instructors</h3>
                    </div>
                    <p className="text-sm text-muted-foreground">
                        Search and add faculty members as instructors
                    </p>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        {/* Search */}
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                            <input
                                type="text"
                                placeholder="Search faculty by name, email, or ID..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="flex h-10 w-full rounded-md border border-input bg-background pl-9 pr-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                            />
                        </div>

                        {/* Available Faculty */}
                        <div className="space-y-3 max-h-64 overflow-y-auto">
                            {availableFaculty.length === 0 ? (
                                <Alert>
                                    <AlertTriangle className="h-4 w-4" />
                                    <AlertDescription>
                                        {searchTerm
                                            ? `No faculty members found matching "${searchTerm}"`
                                            : "All active faculty members are already assigned to this course"}
                                    </AlertDescription>
                                </Alert>
                            ) : (
                                availableFaculty.map((facultyMember) => (
                                    <div
                                        key={facultyMember.id}
                                        className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800"
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-900">
                                                <UserCheck className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                                            </div>
                                            <div>
                                                <div className="font-medium text-gray-900 dark:text-gray-100">
                                                    {facultyMember.name}
                                                </div>
                                                <div className="text-sm text-gray-500 dark:text-gray-400">
                                                    {facultyMember.email} •{" "}
                                                    {facultyMember.profileId}
                                                </div>
                                            </div>
                                        </div>
                                        <Button
                                            onClick={() => handleAddInstructor(facultyMember.id)}
                                            variant="outline"
                                            size="sm"
                                            disabled={isLoading}
                                            className="text-green-600 hover:text-green-700"
                                        >
                                            <Plus className="h-4 w-4" />
                                        </Button>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Actions */}
            <div className="flex justify-end pt-4 border-t">
                <Button onClick={onClose} variant="outline">
                    Close
                </Button>
            </div>
        </div>
    );
}
