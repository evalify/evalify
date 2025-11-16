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
            `${feature} is not yet implemented. Please implement the corresponding CRUD operations in the tRPC course router (src/server/trpc/routers/administrative/course.ts) using the existing Drizzle relationship tables (courseStudentsTable, courseBatchesTable, courseInstructorsTable).`,
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
                            The Drizzle schema relationship tables are already defined. To enable
                            course assignments, implement the CRUD operations in the tRPC course
                            router:
                        </p>
                        <ul className="text-yellow-700 dark:text-yellow-300 text-sm space-y-1 mb-4">
                            <li>
                                • <code>courseStudentsTable</code> - Link courses to individual
                                students (src/db/schema/course/course-student.ts)
                            </li>
                            <li>
                                • <code>courseBatchesTable</code> - Link courses to student batches
                                (src/db/schema/course/course-batch.ts)
                            </li>
                            <li>
                                • <code>courseInstructorsTable</code> - Link courses to faculty
                                instructors (src/db/schema/course/course-instructor.ts)
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
                <h3 className="font-semibold mb-3">Required Schema Definitions (Drizzle ORM)</h3>
                <pre className="text-sm bg-gray-100 dark:bg-gray-800 p-4 rounded overflow-x-auto">
                    {`// src/db/schema/course/course-student.ts
import { index, uuid, primaryKey, pgTable } from "drizzle-orm/pg-core";
import { coursesTable } from "./course";
import { usersTable } from "../user/user";
import { timestamps } from "../utils";

export const courseStudentsTable = pgTable(
  "course_students",
  {
    courseId: uuid("course_id")
      .notNull()
      .references(() => coursesTable.id, { onDelete: "cascade" }),
    studentId: uuid("student_id")
      .notNull()
      .references(() => usersTable.id, { onDelete: "cascade" }),
    ...timestamps, // created_at, updated_at
  },
  (table) => [
    primaryKey({ columns: [table.courseId, table.studentId] }),
    index("idx_course_students_course_id").on(table.courseId),
    index("idx_course_students_student_id").on(table.studentId),
  ]
);

// src/db/schema/course/course-batch.ts
export const courseBatchesTable = pgTable(
  "course_batches",
  {
    courseId: uuid("course_id")
      .notNull()
      .references(() => coursesTable.id, { onDelete: "cascade" }),
    batchId: uuid("batch_id")
      .notNull()
      .references(() => batchesTable.id, { onDelete: "cascade" }),
    ...timestamps,
  },
  (table) => [
    primaryKey({ columns: [table.courseId, table.batchId] }),
    index("idx_course_batches_course_id").on(table.courseId),
    index("idx_course_batches_batch_id").on(table.batchId),
  ]
);

// src/db/schema/course/course-instructor.ts
export const courseInstructorsTable = pgTable(
  "course_instructors",
  {
    courseId: uuid("course_id")
      .notNull()
      .references(() => coursesTable.id, { onDelete: "cascade" }),
    instructorId: uuid("instructor_id")
      .notNull()
      .references(() => usersTable.id, { onDelete: "cascade" }),
    ...timestamps,
  },
  (table) => [
    primaryKey({ columns: [table.courseId, table.instructorId] }),
    index("idx_course_instructors_course_id").on(table.courseId),
    index("idx_course_instructors_instructor_id").on(table.instructorId),
  ]
);`}
                </pre>
            </Card>
        </div>
    );
}
