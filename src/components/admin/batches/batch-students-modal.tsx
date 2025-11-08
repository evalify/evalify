"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Search, UserPlus, UserMinus, Users, CheckCircle, Loader2 } from "lucide-react";
import { useAnalytics } from "@/hooks/use-analytics";
import { useToast } from "@/hooks/use-toast";

interface BatchStudentsModalProps {
    batchId: string;
    batchName: string;
    onClose: () => void;
}

export function BatchStudentsModal({ batchId, batchName }: BatchStudentsModalProps) {
    const [searchTerm, setSearchTerm] = useState("");
    const [selectedStudents, setSelectedStudents] = useState<Set<string>>(new Set());
    const [isAddingStudents, setIsAddingStudents] = useState(false);

    const { track } = useAnalytics();
    const { success, error } = useToast();
    const utils = trpc.useUtils();

    // Queries
    const { data: batchStudents = [] } = trpc.batch.getStudents.useQuery({ batchId });

    const { data: availableStudentsData = [] } = trpc.batch.getAvailableStudents.useQuery({
        batchId,
        searchTerm: searchTerm || undefined,
    });

    // Mutations
    const addStudentsToBatch = trpc.batch.addStudents.useMutation({
        onSuccess: () => {
            success("Successfully added student(s) to the batch");
            utils.batch.getStudents.invalidate({ batchId });
            utils.batch.getAvailableStudents.invalidate({ batchId });
            setSelectedStudents(new Set());
            setSearchTerm("");
        },
        onError: (err) => {
            error(err.message || "Failed to add students to batch");
        },
    });

    const removeStudentsFromBatch = trpc.batch.removeStudents.useMutation({
        onSuccess: () => {
            success("Student has been removed from the batch");
            utils.batch.getStudents.invalidate({ batchId });
            utils.batch.getAvailableStudents.invalidate({ batchId });
        },
        onError: (err) => {
            error(err.message || "Failed to remove student from batch");
        },
    });

    // Available students already filtered by backend
    const availableStudents = availableStudentsData;

    const handleSelectStudent = (studentId: string) => {
        const newSelected = new Set(selectedStudents);
        if (newSelected.has(studentId)) {
            newSelected.delete(studentId);
        } else {
            newSelected.add(studentId);
        }
        setSelectedStudents(newSelected);
    };

    const handleAddSelectedStudents = async () => {
        if (selectedStudents.size === 0) return;

        setIsAddingStudents(true);
        try {
            const studentIds = Array.from(selectedStudents);
            await addStudentsToBatch.mutateAsync({
                batchId,
                studentIds,
            });

            track("batch_students_added", {
                batchId,
                studentCount: selectedStudents.size,
            });
        } catch (error) {
            console.error("Error adding students to batch:", error);
        } finally {
            setIsAddingStudents(false);
        }
    };

    const handleRemoveStudent = async (studentId: string) => {
        try {
            await removeStudentsFromBatch.mutateAsync({ batchId, studentIds: [studentId] });
            track("batch_student_removed", { batchId, studentId });
        } catch (error) {
            console.error("Error removing student from batch:", error);
        }
    };

    const handleSelectAll = () => {
        if (selectedStudents.size === availableStudents.length) {
            // Deselect all
            setSelectedStudents(new Set());
        } else {
            // Select all available students
            setSelectedStudents(new Set(availableStudents.map((s) => s.id)));
        }
    };

    const getInitials = (name: string) => {
        return name
            .split(" ")
            .map((n) => n[0])
            .join("")
            .toUpperCase()
            .slice(0, 2);
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <p className="text-gray-600 dark:text-gray-400">
                        {batchName} • {batchStudents.length} students enrolled
                    </p>
                </div>
            </div>

            <div className="grid gap-6 lg:grid-cols-2">
                {/* Add Students Section */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <UserPlus className="h-5 w-5" />
                            Add Students
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {/* Search */}
                        <div className="space-y-2">
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                                <Input
                                    placeholder="Search students..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="pl-9"
                                />
                            </div>
                        </div>

                        {/* Selection Controls */}
                        <div className="flex items-center justify-between">
                            <div className="text-sm text-gray-600 dark:text-gray-400">
                                {selectedStudents.size} of {availableStudents.length} students
                                selected
                            </div>
                            <div className="flex gap-2">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={handleSelectAll}
                                    disabled={availableStudents.length === 0}
                                >
                                    {selectedStudents.size === availableStudents.length
                                        ? "Deselect All"
                                        : "Select All"}
                                </Button>
                                <Button
                                    size="sm"
                                    onClick={handleAddSelectedStudents}
                                    disabled={selectedStudents.size === 0 || isAddingStudents}
                                >
                                    {isAddingStudents ? (
                                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                    ) : (
                                        <UserPlus className="h-4 w-4 mr-2" />
                                    )}
                                    Add Selected ({selectedStudents.size})
                                </Button>
                            </div>
                        </div>

                        {/* Available Students List */}
                        <div className="max-h-96 overflow-y-auto space-y-2">
                            {availableStudents.length === 0 ? (
                                <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                                    {searchTerm
                                        ? `No students found matching "${searchTerm}"`
                                        : "No available students to add"}
                                </div>
                            ) : (
                                availableStudents.map((student) => (
                                    <div
                                        key={student.id}
                                        className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                                            selectedStudents.has(student.id)
                                                ? "border-blue-300 bg-blue-50 dark:bg-blue-900/20 dark:border-blue-700"
                                                : "border-gray-200 hover:border-gray-300 dark:border-gray-700 dark:hover:border-gray-600"
                                        }`}
                                        onClick={() => handleSelectStudent(student.id)}
                                    >
                                        <div className="relative">
                                            <Avatar className="h-10 w-10">
                                                <AvatarImage
                                                    src={student.profileImage || undefined}
                                                    alt={student.name}
                                                />
                                                <AvatarFallback className="bg-gray-100 dark:bg-gray-800">
                                                    {getInitials(student.name)}
                                                </AvatarFallback>
                                            </Avatar>
                                            {selectedStudents.has(student.id) && (
                                                <CheckCircle className="absolute -top-1 -right-1 h-5 w-5 text-blue-600 bg-white rounded-full" />
                                            )}
                                        </div>
                                        <div className="flex-1">
                                            <div className="font-medium text-gray-900 dark:text-gray-100">
                                                {student.name}
                                            </div>
                                            <div className="text-sm text-gray-500 dark:text-gray-400">
                                                {student.email}
                                            </div>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </CardContent>
                </Card>
                {/* Current Students Section */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Users className="h-5 w-5" />
                            Current Students ({batchStudents.length})
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="max-h-96 overflow-y-auto space-y-2">
                            {batchStudents.length === 0 ? (
                                <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                                    No students in this batch yet
                                </div>
                            ) : (
                                batchStudents.map((student) => (
                                    <div
                                        key={student.id}
                                        className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 dark:border-gray-700"
                                    >
                                        <Avatar className="h-10 w-10">
                                            <AvatarImage
                                                src={student.profileImage || undefined}
                                                alt={student.name}
                                            />
                                            <AvatarFallback className="bg-gray-100 dark:bg-gray-800">
                                                {getInitials(student.name)}
                                            </AvatarFallback>
                                        </Avatar>
                                        <div className="flex-1">
                                            <div className="font-medium text-gray-900 dark:text-gray-100">
                                                {student.name}
                                            </div>
                                            <div className="text-sm text-gray-500 dark:text-gray-400">
                                                {student.email}
                                            </div>
                                        </div>
                                        <Badge
                                            variant={
                                                student.status === "ACTIVE"
                                                    ? "default"
                                                    : "secondary"
                                            }
                                        >
                                            {student.status}
                                        </Badge>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => handleRemoveStudent(student.id)}
                                            className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
                                        >
                                            <UserMinus className="h-4 w-4" />
                                        </Button>
                                    </div>
                                ))
                            )}
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
