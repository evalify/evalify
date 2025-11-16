"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc/client";
import { useToast } from "@/hooks/use-toast";
import { useAnalytics } from "@/hooks/use-analytics";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Users, Plus, X, Search, AlertTriangle } from "lucide-react";
import { ConfirmationDialog } from "@/components/ui/custom-alert-dialog";

interface CourseStudentsModalProps {
    courseId: string;
    onClose: () => void;
}

export function CourseStudentsModal({ courseId, onClose }: CourseStudentsModalProps) {
    const [searchTerm, setSearchTerm] = useState("");
    const [isLoading, setIsLoading] = useState(false);

    // Confirmation dialog state
    const [isRemoveDialogOpen, setIsRemoveDialogOpen] = useState(false);
    const [studentToRemove, setStudentToRemove] = useState<string | null>(null);

    const { track } = useAnalytics();
    const { success, error } = useToast();

    // Queries
    const { data: studentsData, isLoading: loadingStudents } = trpc.course.getStudents.useQuery({
        courseId,
    });

    const { data: availableData } = trpc.course.getAvailableStudents.useQuery({
        courseId,
        searchTerm: searchTerm || undefined,
    });

    const students = studentsData || [];
    const availableStudents = availableData || [];

    // Mutations
    const utils = trpc.useUtils();
    const addStudent = trpc.course.addStudent.useMutation({
        onSuccess: () => {
            utils.course.getStudents.invalidate({ courseId });
            utils.course.getAvailableStudents.invalidate({ courseId });
            success("Student added to course successfully");
        },
        onError: (err) => {
            error(err.message || "Failed to add student to course");
        },
    });

    const removeStudent = trpc.course.removeStudent.useMutation({
        onSuccess: () => {
            utils.course.getStudents.invalidate({ courseId });
            utils.course.getAvailableStudents.invalidate({ courseId });
            success("Student removed from course successfully");
        },
        onError: (err) => {
            error(err.message || "Failed to remove student from course");
        },
    });

    const handleAddStudent = async (studentId: string) => {
        setIsLoading(true);
        try {
            await addStudent.mutateAsync({ courseId, studentId });
            track("course_student_added", { courseId, studentId });
        } finally {
            setIsLoading(false);
        }
    };

    const handleRemoveStudent = async (studentId: string) => {
        setStudentToRemove(studentId);
        setIsRemoveDialogOpen(true);
    };

    const confirmRemoveStudent = async () => {
        if (!studentToRemove) return;

        setIsLoading(true);
        try {
            await removeStudent.mutateAsync({ courseId, studentId: studentToRemove });
            track("course_student_removed", { courseId, studentId: studentToRemove });
        } finally {
            setIsLoading(false);
            setIsRemoveDialogOpen(false);
            setStudentToRemove(null);
        }
    };

    return (
        <div className="space-y-6">
            {/* Current Students */}
            <Card>
                <CardHeader>
                    <div className="flex items-center gap-2">
                        <Users className="h-5 w-5" />
                        <h3 className="text-lg font-semibold">Enrolled Students</h3>
                    </div>
                    <p className="text-sm text-muted-foreground">
                        {students.length} student{students.length !== 1 ? "s" : ""} enrolled
                    </p>
                </CardHeader>
                <CardContent>
                    {loadingStudents ? (
                        <p className="text-sm text-muted-foreground">Loading students...</p>
                    ) : students.length === 0 ? (
                        <Alert>
                            <AlertTriangle className="h-4 w-4" />
                            <AlertDescription>
                                No students are currently enrolled in this course.
                            </AlertDescription>
                        </Alert>
                    ) : (
                        <div className="space-y-3 max-h-64 overflow-y-auto">
                            {students.map((student) => (
                                <div
                                    key={student.id}
                                    className="flex items-center justify-between p-3 border rounded-lg"
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-100 dark:bg-purple-900">
                                            <Users className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                                        </div>
                                        <div>
                                            <div className="font-medium text-gray-900 dark:text-gray-100">
                                                {student.name}
                                            </div>
                                            <div className="text-sm text-gray-500 dark:text-gray-400">
                                                {student.email} • {student.profileId}
                                            </div>
                                        </div>
                                    </div>
                                    <Button
                                        onClick={() => handleRemoveStudent(student.id)}
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

            {/* Add New Students */}
            <Card>
                <CardHeader>
                    <div className="flex items-center gap-2">
                        <Plus className="h-5 w-5" />
                        <h3 className="text-lg font-semibold">Add Students</h3>
                    </div>
                    <p className="text-sm text-muted-foreground">
                        {`Search and enroll students in this course. Note: Students from batches
                        already assigned to this course are automatically enrolled and won't
                        appear here.`}
                    </p>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        {/* Search */}
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                            <input
                                type="text"
                                placeholder="Search students by name, email, or ID..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="flex h-10 w-full rounded-md border border-input bg-background pl-9 pr-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                            />
                        </div>

                        {/* Available Students */}
                        <div className="space-y-3 max-h-64 overflow-y-auto">
                            {availableStudents.length === 0 ? (
                                <Alert>
                                    <AlertTriangle className="h-4 w-4" />
                                    <AlertDescription>
                                        {searchTerm
                                            ? `No students found matching "${searchTerm}"`
                                            : "All active students are already enrolled in this course (either directly or through batch assignment)"}
                                    </AlertDescription>
                                </Alert>
                            ) : (
                                availableStudents.map((student) => (
                                    <div
                                        key={student.id}
                                        className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800"
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-100 dark:bg-purple-900">
                                                <Users className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                                            </div>
                                            <div>
                                                <div className="font-medium text-gray-900 dark:text-gray-100">
                                                    {student.name}
                                                </div>
                                                <div className="text-sm text-gray-500 dark:text-gray-400">
                                                    {student.email} • {student.profileId}
                                                </div>
                                            </div>
                                        </div>
                                        <Button
                                            onClick={() => handleAddStudent(student.id)}
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

            {/* Remove Student Confirmation Dialog */}
            <ConfirmationDialog
                isOpen={isRemoveDialogOpen}
                onOpenChange={setIsRemoveDialogOpen}
                title="Remove Student"
                message="Are you sure you want to remove this student from the course?"
                onAccept={confirmRemoveStudent}
                confirmButtonText="Remove"
                cancelButtonText="Cancel"
            />
        </div>
    );
}
