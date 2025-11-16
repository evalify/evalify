"use client";

import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useAnalytics } from "@/hooks/use-analytics";
import { Users, GraduationCap, BookOpen, X, AlertCircle } from "lucide-react";

interface CourseAssignmentProps {
    courseId: string;
    courseName: string;
    courseCode: string;
    onClose: () => void;
}

export function CourseAssignment({
    courseId: _courseId,
    courseName,
    courseCode,
    onClose,
}: CourseAssignmentProps) {
    const { track: _track } = useAnalytics();
    const { error } = useToast();

    const handleImplementationAlert = (feature: string) => {
        error(
            `${feature} is not yet implemented. Please add the required relationship tables (courseStudents, courseBatches, courseInstructors) to your database schema and implement the corresponding CRUD operations.`,
            { duration: 6000 }
        );
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold">Course Assignments</h2>
                    <p className="text-gray-600 dark:text-gray-400">
                        {courseName} ({courseCode})
                    </p>
                </div>
                <Button variant="outline" onClick={onClose}>
                    <X className="h-4 w-4 mr-2" />
                    Close
                </Button>
            </div>

            {/* Implementation Notice */}
            <Card className="p-6 border-yellow-200 bg-yellow-50 dark:bg-yellow-900/20 dark:border-yellow-800">
                <div className="flex items-start">
                    <AlertCircle className="h-5 w-5 text-yellow-600 dark:text-yellow-400 mt-0.5 mr-3" />
                    <div>
                        <h3 className="font-semibold text-yellow-800 dark:text-yellow-200 mb-2">
                            Relationship Management Not Yet Implemented
                        </h3>
                        <p className="text-yellow-700 dark:text-yellow-300 text-sm mb-3">
                            To enable course assignments, you need to add relationship tables to
                            your Convex schema:
                        </p>
                        <ul className="text-yellow-700 dark:text-yellow-300 text-sm space-y-1 mb-4">
                            <li>
                                • <code>courseStudents</code> - Link courses to individual students
                            </li>
                            <li>
                                • <code>courseBatches</code> - Link courses to student batches
                            </li>
                            <li>
                                • <code>courseInstructors</code> - Link courses to faculty
                                instructors
                            </li>
                        </ul>
                        <Button
                            variant="outline"
                            size="sm"
                            className="text-yellow-800 border-yellow-300 hover:bg-yellow-100"
                            onClick={() => handleImplementationAlert("Course Relationships")}
                        >
                            View Implementation Guide
                        </Button>
                    </div>
                </div>
            </Card>

            {/* Instructors Section */}
            <Card className="p-6">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center">
                        <GraduationCap className="h-5 w-5 mr-2" />
                        <h3 className="text-lg font-semibold">Assign Instructors</h3>
                    </div>
                    <Button
                        variant="outline"
                        onClick={() => handleImplementationAlert("Instructor Assignment")}
                    >
                        Manage Instructors
                    </Button>
                </div>
                <p className="text-gray-600 dark:text-gray-400">
                    Assign faculty members to teach this course. Multiple instructors can be
                    assigned for team teaching.
                </p>
            </Card>

            {/* Batches Section */}
            <Card className="p-6">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center">
                        <Users className="h-5 w-5 mr-2" />
                        <h3 className="text-lg font-semibold">Assign Student Batches</h3>
                    </div>
                    <Button
                        variant="outline"
                        onClick={() => handleImplementationAlert("Batch Assignment")}
                    >
                        Manage Batches
                    </Button>
                </div>
                <p className="text-gray-600 dark:text-gray-400">
                    Assign entire student batches to this course. This is efficient for courses
                    taken by whole classes.
                </p>
            </Card>

            {/* Individual Students Section */}
            <Card className="p-6">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center">
                        <BookOpen className="h-5 w-5 mr-2" />
                        <h3 className="text-lg font-semibold">Assign Individual Students</h3>
                    </div>
                    <Button
                        variant="outline"
                        onClick={() => handleImplementationAlert("Student Assignment")}
                    >
                        Manage Students
                    </Button>
                </div>
                <p className="text-gray-600 dark:text-gray-400">
                    Assign individual students to this course. Useful for electives or special cases
                    where not all batch students take the course.
                </p>
            </Card>

            {/* Schema Example */}
            <Card className="p-6 bg-gray-50 dark:bg-gray-900">
                <h3 className="font-semibold mb-3">Required Schema Additions</h3>
                <pre className="text-sm bg-gray-100 dark:bg-gray-800 p-4 rounded overflow-x-auto">
                    {`// Add to convex/schema.ts

const courseStudentSchema = defineTable({
  courseId: v.id("courses"),
  studentId: v.id("users"),
  enrolledAt: v.number(),
  isActive: statusValidator,
})
  .index("by_course", ["courseId"])
  .index("by_student", ["studentId"]);

const courseBatchSchema = defineTable({
  courseId: v.id("courses"),
  batchId: v.id("batches"),
  assignedAt: v.number(),
  isActive: statusValidator,
})
  .index("by_course", ["courseId"])
  .index("by_batch", ["batchId"]);

const courseInstructorSchema = defineTable({
  courseId: v.id("courses"),
  instructorId: v.id("users"),
  assignedAt: v.number(),
  isActive: statusValidator,
})
  .index("by_course", ["courseId"])
  .index("by_instructor", ["instructorId"]);`}
                </pre>
            </Card>
        </div>
    );
}
