"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
    Users,
    BookOpen,
    AlertCircle,
    GraduationCap,
    Search,
    CheckCircle2,
    Circle,
    MapPin,
    X,
    Check,
    ChevronDown,
} from "lucide-react";
import { trpc } from "@/lib/trpc/client";
import { QuizParticipantData, BatchResponse, LabResponse, StudentInMap } from "./types";
import { cn } from "@/lib/utils";

export interface QuizParticipantProps {
    data: QuizParticipantData;
    updateData: (
        data: QuizParticipantData | ((prev: QuizParticipantData) => QuizParticipantData)
    ) => void;
}

/**
 * Renders the participant selection UI for a quiz, allowing selection of courses, batches, individual students, and lab restrictions.
 *
 * The component shows summary counts, searchable lists, bulk student selection, and collapsible sections for optional selections.
 * It also synchronizes selections: when courses are added their associated batches are auto-selected (skipped on initial mount), selecting a batch removes its students from individual selections, and deselecting a course removes its associated batches.
 *
 * @param data - Current QuizParticipantData containing selected courses, batches, students, and labs.
 * @param updateData - Callback invoked with an updated QuizParticipantData object to persist selection changes.
 * @returns The rendered React element for the quiz participant selection interface.
 */
export function QuizParticipant({ data, updateData }: QuizParticipantProps) {
    const [searchStudents, setSearchStudents] = useState("");
    const [searchLabs, setSearchLabs] = useState("");
    const [searchBatches, setSearchBatches] = useState("");

    // Initialize collapsible state based on whether there are selections
    // This avoids needing useEffect to sync state
    const [isStudentsOpen, setIsStudentsOpen] = useState(() => data.students.length > 0);
    const [isLabsOpen, setIsLabsOpen] = useState(() => data.labs.length > 0);

    // Track if this is the initial mount to prevent auto-selecting batches on load
    const isInitialMount = useRef(true);
    const previousCoursesRef = useRef<string[]>([]);

    // Fetch courses
    const {
        data: coursesData,
        isLoading: coursesLoading,
        error: coursesError,
    } = trpc.facultyCourse.list.useQuery({
        isActive: "ACTIVE",
        limit: 100,
    });

    // Fetch students for quiz assignment (from selected courses, excluding selected batches)
    const {
        data: studentsData,
        isLoading: studentsLoading,
        error: studentsError,
    } = trpc.facultyCourse.getStudentsForQuizAssignment.useQuery(
        { courseIds: data.courses, excludeBatchIds: data.batches },
        { enabled: data.courses.length > 0 }
    );

    // Fetch batches for selected courses (using course-batch relationship)
    const {
        data: batchesData,
        isLoading: batchesLoading,
        error: batchesError,
    } = trpc.facultyCourse.getBatchesByCourses.useQuery(
        { courseIds: data.courses },
        { enabled: data.courses.length > 0 }
    );

    // Fetch all batches as fallback
    const {
        data: allBatchesData,
        isLoading: allBatchesLoading,
        error: allBatchesError,
    } = trpc.facultyCourse.getAllBatches.useQuery(undefined, {
        enabled: data.courses.length === 0,
    });

    // Fetch students from selected batches to calculate total student count
    const { data: batchStudentsData, isLoading: _batchStudentsLoading } =
        trpc.facultyCourse.getStudentsByBatches.useQuery(
            { batchIds: data.batches },
            { enabled: data.batches.length > 0 }
        );

    // Fetch students for all available batches to check membership when selecting batches
    const allAvailableBatchIds = useMemo(() => {
        if (data.courses.length === 0) {
            return allBatchesData?.map((b) => b.id) || [];
        }
        return batchesData?.map((b) => b.id) || [];
    }, [batchesData, allBatchesData, data.courses.length]);

    const { data: allBatchStudentsData, isLoading: _allBatchStudentsLoading } =
        trpc.facultyCourse.getStudentsByBatches.useQuery(
            { batchIds: allAvailableBatchIds },
            { enabled: allAvailableBatchIds.length > 0 }
        );

    // Fetch labs
    const {
        data: labsData,
        isLoading: labsLoading,
        error: labsError,
    } = trpc.facultyCourse.getAllLabs.useQuery();

    // Map students to simple format
    const availableStudents = useMemo(() => {
        if (!studentsData) return [];

        return studentsData.map((student) => ({
            id: student.id,
            name: student.name || "Unknown",
            email: student.email || "",
        }));
    }, [studentsData]);

    // Get batches for selected courses (using the direct course-batch relationship)
    // This replaces the old logic that tried to infer batches from student data
    // Deduplicates batches by ID to avoid rendering duplicates when a batch belongs to multiple courses
    const batchesForSelectedCourses = useMemo(() => {
        // If no courses selected, show all batches
        if (data.courses.length === 0) {
            return allBatchesData || [];
        }

        // Deduplicate batches by ID (a batch can belong to multiple courses)
        const batchMap = new Map<string, BatchResponse>();
        batchesData?.forEach((batch) => {
            if (!batchMap.has(batch.id)) {
                batchMap.set(batch.id, batch);
            }
        });

        return Array.from(batchMap.values());
    }, [batchesData, allBatchesData, data.courses.length]);

    // Filter labs
    const filteredLabs = useMemo(() => {
        if (!labsData) return [];
        if (!searchLabs) return labsData;

        const query = searchLabs.toLowerCase();
        return labsData.filter(
            (lab: LabResponse) =>
                lab.name.toLowerCase().includes(query) || lab.block?.toLowerCase().includes(query)
        );
    }, [labsData, searchLabs]);

    // Filter students by search query only
    const filteredStudents = useMemo(() => {
        let students = availableStudents;

        // Filter by search query
        if (searchStudents) {
            const query = searchStudents.toLowerCase();
            students = students.filter(
                (student: StudentInMap) =>
                    student.name.toLowerCase().includes(query) ||
                    student.email.toLowerCase().includes(query)
            );
        }

        return students;
    }, [availableStudents, searchStudents]);

    // Auto-select batches when courses are selected or when batches data changes
    // This ensures that when a course is selected, its batches are automatically selected
    // BUT: Skip this on initial mount to preserve saved batch selections in edit mode
    useEffect(() => {
        // Skip auto-selection on initial mount
        if (isInitialMount.current) {
            isInitialMount.current = false;
            previousCoursesRef.current = data.courses;
            return;
        }

        // Only auto-select batches if new courses were added
        const newCourses = data.courses.filter(
            (courseId) => !previousCoursesRef.current.includes(courseId)
        );

        if (newCourses.length > 0 && batchesData && batchesData.length > 0) {
            // Get all batch IDs from the fetched batches for selected courses
            const availableBatchIds = batchesData.map((batch: BatchResponse) => batch.id);

            // Use functional updater to avoid stale closures
            updateData((currentData: QuizParticipantData) => {
                // Add any new batches that aren't already selected
                const newBatches = availableBatchIds.filter(
                    (batchId: string) => !currentData.batches.includes(batchId)
                );

                if (newBatches.length > 0) {
                    return {
                        ...currentData,
                        batches: [...currentData.batches, ...newBatches],
                    };
                }
                return currentData;
            });
        }

        // Update previous courses
        previousCoursesRef.current = data.courses;
    }, [batchesData, data.courses, updateData]);

    const handleCourseToggle = (courseId: string) => {
        const isSelected = data.courses.includes(courseId);

        if (isSelected) {
            // DESELECTING COURSE: Remove course and auto-deselect its associated batches
            // Get all batch IDs that belong to this course from the course-batch relationship
            const courseBatchIds = new Set<string>();

            // Get batches for this specific course
            const currentBatchesData = data.courses.length > 0 ? batchesData : allBatchesData;
            currentBatchesData?.forEach((batch: BatchResponse & { courseId?: string }) => {
                if (batch.courseId === courseId) {
                    courseBatchIds.add(batch.id);
                }
            });

            // Remove the course and its batches
            updateData({
                ...data,
                courses: data.courses.filter((c: string) => c !== courseId),
                batches: data.batches.filter((b: string) => !courseBatchIds.has(b)),
            });
        } else {
            // SELECTING COURSE: Add course and auto-select its associated batches
            // We need to fetch the batches for this course, which will happen automatically
            // when the component re-renders with the updated courses array
            updateData({
                ...data,
                courses: [...data.courses, courseId],
            });
        }
    };

    const handleBatchToggle = (batchId: string) => {
        const isSelected = data.batches.includes(batchId);

        if (isSelected) {
            // DESELECTING BATCH: Remove batch
            updateData({
                ...data,
                batches: data.batches.filter((b: string) => b !== batchId),
            });
        } else {
            // SELECTING BATCH: Add batch and remove any individually selected students from this batch
            // since they'll now get the quiz through batch assignment
            const studentsInBatch = new Set<string>();

            // Get all student IDs that belong to this batch
            if (allBatchStudentsData) {
                allBatchStudentsData.forEach((student) => {
                    if (student.batchId === batchId && student.id) {
                        studentsInBatch.add(student.id);
                    }
                });
            }

            // Remove students that are in this batch from individual selections
            const updatedStudents = data.students.filter(
                (studentId) => !studentsInBatch.has(studentId)
            );

            updateData({
                ...data,
                batches: [...data.batches, batchId],
                students: updatedStudents,
            });
        }
    };

    const handleStudentToggle = (studentId: string) => {
        const isSelected = data.students.includes(studentId);

        if (isSelected) {
            updateData({
                ...data,
                students: data.students.filter((s) => s !== studentId),
            });
        } else {
            updateData({
                ...data,
                students: [...data.students, studentId],
            });
        }
    };

    const handleLabToggle = (labId: string) => {
        const isSelected = data.labs.includes(labId);

        if (isSelected) {
            updateData({
                ...data,
                labs: data.labs.filter((l) => l !== labId),
            });
        } else {
            updateData({
                ...data,
                labs: [...data.labs, labId],
            });
        }
    };

    const handleSelectAllStudents = () => {
        // Select all currently visible/filtered students
        const studentIds = filteredStudents.map((s: StudentInMap) => s.id);
        updateData({
            ...data,
            students: [...new Set([...data.students, ...studentIds])],
        });
    };

    const handleDeselectAllStudents = () => {
        // Deselect all currently visible/filtered students
        const studentIdsToRemove = filteredStudents.map((s: StudentInMap) => s.id);
        updateData({
            ...data,
            students: data.students.filter((s: string) => !studentIdsToRemove.includes(s)),
        });
    };

    const getTotalStudentCount = (): number => {
        return availableStudents.length;
    };

    const getSelectedStudentCount = (): number => {
        const availableStudentIds = new Set(availableStudents.map((s: StudentInMap) => s.id));
        return data.students.filter((s: string) => availableStudentIds.has(s)).length;
    };

    // Calculate total unique students who will receive the quiz
    // This includes students in selected batches + individually selected students (without duplicates)
    const getTotalQuizRecipients = (): number => {
        const studentIds = new Set<string>();

        // Add students from selected batches
        if (batchStudentsData) {
            batchStudentsData.forEach((student) => {
                if (student.id) studentIds.add(student.id);
            });
        }

        // Add individually selected students
        data.students.forEach((studentId) => {
            studentIds.add(studentId);
        });

        return studentIds.size;
    };

    if (coursesError || studentsError || batchesError || allBatchesError || labsError) {
        return (
            <Card>
                <CardContent className="p-6">
                    <div className="flex items-start gap-3">
                        <AlertCircle className="h-5 w-5 text-destructive mt-0.5 shrink-0" />
                        <div className="text-sm">
                            <p className="font-medium text-destructive mb-2">Error loading data</p>
                            <p className="text-muted-foreground">
                                {coursesError?.message ||
                                    studentsError?.message ||
                                    batchesError?.message ||
                                    allBatchesError?.message ||
                                    labsError?.message}
                            </p>
                        </div>
                    </div>
                </CardContent>
            </Card>
        );
    }

    const isLoading =
        coursesLoading || studentsLoading || batchesLoading || allBatchesLoading || labsLoading;
    const allStudentsSelected =
        getSelectedStudentCount() === getTotalStudentCount() && getTotalStudentCount() > 0;

    return (
        <TooltipProvider>
            <div className="space-y-4">
                {/* Summary Bar */}
                <Card className="bg-linear-to-r from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 border-blue-200 dark:border-blue-800">
                    <CardContent className="py-4">
                        <div className="flex flex-wrap items-stretch justify-between gap-3">
                            <div className="flex items-center gap-2.5 min-w-[110px]">
                                <div className="p-1.5 rounded-md bg-blue-500/10 border border-blue-500/20">
                                    <BookOpen className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                                </div>
                                <div className="flex flex-col justify-center">
                                    <p className="text-xs text-muted-foreground leading-none">
                                        Courses
                                    </p>
                                    <p className="text-base font-bold text-blue-700 dark:text-blue-300 leading-none mt-1">
                                        {data.courses.length}
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2.5 min-w-[110px]">
                                <div className="p-1.5 rounded-md bg-purple-500/10 border border-purple-500/20">
                                    <GraduationCap className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                                </div>
                                <div className="flex flex-col justify-center">
                                    <p className="text-xs text-muted-foreground leading-none">
                                        Batches
                                    </p>
                                    <p className="text-base font-bold text-purple-700 dark:text-purple-300 leading-none mt-1">
                                        {data.batches.length}
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2.5 min-w-[110px]">
                                <div className="p-1.5 rounded-md bg-green-500/10 border border-green-500/20">
                                    <Users className="h-4 w-4 text-green-600 dark:text-green-400" />
                                </div>
                                <div className="flex flex-col justify-center">
                                    <p className="text-xs text-muted-foreground leading-none">
                                        Students
                                    </p>
                                    <p className="text-base font-bold text-green-700 dark:text-green-300 leading-none mt-1">
                                        {getTotalQuizRecipients()}
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2.5 min-w-[110px]">
                                <div className="p-1.5 rounded-md bg-orange-500/10 border border-orange-500/20">
                                    <MapPin className="h-4 w-4 text-orange-600 dark:text-orange-400" />
                                </div>
                                <div className="flex flex-col justify-center">
                                    <p className="text-xs text-muted-foreground leading-none">
                                        Labs
                                    </p>
                                    <p className="text-base font-bold text-orange-700 dark:text-orange-300 leading-none mt-1">
                                        {data.labs.length === 0 ? "All" : data.labs.length}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Main Selection Area */}
                <div className="space-y-3">
                    {/* Courses - Required */}
                    <Card
                        className={cn(
                            data.courses.length === 0 &&
                                "border-red-400 dark:border-red-600 bg-red-50/50 dark:bg-red-950/20"
                        )}
                    >
                        <CardHeader className="pb-3">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2.5">
                                    <div className="p-1.5 rounded-md bg-blue-500/10 border border-blue-500/20">
                                        <BookOpen className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                                    </div>
                                    <div>
                                        <CardTitle className="text-base">Select Courses</CardTitle>
                                        <CardDescription className="text-xs">
                                            Choose which courses this quiz is for
                                        </CardDescription>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    {data.courses.length === 0 && (
                                        <Badge variant="destructive" className="text-xs">
                                            Required
                                        </Badge>
                                    )}
                                    {data.courses.length > 0 && (
                                        <Badge className="bg-blue-500 hover:bg-blue-600 text-xs">
                                            {data.courses.length} selected
                                        </Badge>
                                    )}
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="pt-0">
                            <ScrollArea className="h-32 pr-4">
                                {isLoading ? (
                                    <div className="text-center text-sm text-muted-foreground py-8">
                                        Loading courses...
                                    </div>
                                ) : coursesData?.courses && coursesData.courses.length > 0 ? (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                        {coursesData.courses.map(
                                            (course: {
                                                id: string;
                                                code: string;
                                                name: string;
                                            }) => {
                                                const isSelected = data.courses.includes(course.id);
                                                return (
                                                    <button
                                                        key={course.id}
                                                        onClick={() =>
                                                            handleCourseToggle(course.id)
                                                        }
                                                        className={cn(
                                                            "flex items-start gap-2 p-2.5 rounded-md border text-left transition-all",
                                                            "hover:bg-blue-50 hover:border-blue-300 dark:hover:bg-blue-950/30 dark:hover:border-blue-700",
                                                            isSelected
                                                                ? "bg-blue-50 border-blue-400 shadow-sm dark:bg-blue-950/30 dark:border-blue-600"
                                                                : "bg-background border-border"
                                                        )}
                                                    >
                                                        <div className="mt-0.5">
                                                            {isSelected ? (
                                                                <CheckCircle2 className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                                                            ) : (
                                                                <Circle className="h-4 w-4 text-muted-foreground" />
                                                            )}
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <div className="font-semibold text-sm">
                                                                {course.code}
                                                            </div>
                                                            <div className="text-xs text-muted-foreground line-clamp-1 mt-0.5">
                                                                {course.name}
                                                            </div>
                                                        </div>
                                                    </button>
                                                );
                                            }
                                        )}
                                    </div>
                                ) : (
                                    <div className="text-center text-sm text-muted-foreground py-8">
                                        No courses found
                                    </div>
                                )}
                            </ScrollArea>
                        </CardContent>
                    </Card>

                    {/* Batches */}
                    <Card
                        className={cn(
                            data.courses.length > 0 &&
                                data.batches.length === 0 &&
                                data.students.length === 0 &&
                                "border-red-400 dark:border-red-600 bg-red-50/50 dark:bg-red-950/20"
                        )}
                    >
                        <CardHeader className="pb-3">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2.5">
                                    <div className="p-1.5 rounded-md bg-purple-500/10 border border-purple-500/20">
                                        <GraduationCap className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                                    </div>
                                    <div>
                                        <CardTitle className="text-base">Select Batches</CardTitle>
                                        <CardDescription className="text-xs">
                                            {data.courses.length === 0
                                                ? "Select courses first to view batches"
                                                : "Choose batches - all students in selected batches will have access"}
                                        </CardDescription>
                                    </div>
                                </div>
                                {data.batches.length > 0 && (
                                    <Badge className="bg-purple-500 hover:bg-purple-600 text-xs">
                                        {data.batches.length} selected
                                    </Badge>
                                )}
                            </div>
                            {data.courses.length > 0 && batchesForSelectedCourses.length > 0 && (
                                <div className="relative mt-2.5">
                                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                                    <Input
                                        placeholder="Search batches..."
                                        value={searchBatches}
                                        onChange={(e) => setSearchBatches(e.target.value)}
                                        className="pl-8 h-8 text-sm"
                                    />
                                </div>
                            )}
                        </CardHeader>
                        <CardContent className="pt-0">
                            <ScrollArea className="h-32 pr-4">
                                {data.courses.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center text-center py-8 text-muted-foreground">
                                        <GraduationCap className="h-12 w-12 mb-2 opacity-20" />
                                        <p className="text-sm">Select courses first</p>
                                    </div>
                                ) : batchesForSelectedCourses.length > 0 ? (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                        {batchesForSelectedCourses
                                            .filter((batch: BatchResponse) => {
                                                if (!searchBatches) return true;
                                                const query = searchBatches.toLowerCase();
                                                return (
                                                    batch.name.toLowerCase().includes(query) ||
                                                    batch.section.toLowerCase().includes(query) ||
                                                    batch.graduationYear.toString().includes(query)
                                                );
                                            })
                                            .map((batch: BatchResponse) => {
                                                const isSelected = data.batches.includes(batch.id);
                                                return (
                                                    <button
                                                        key={batch.id}
                                                        onClick={() => handleBatchToggle(batch.id)}
                                                        className={cn(
                                                            "flex items-start gap-2 p-2.5 rounded-md border text-left transition-all",
                                                            "hover:bg-purple-50 hover:border-purple-300 dark:hover:bg-purple-950/30 dark:hover:border-purple-700",
                                                            isSelected
                                                                ? "bg-purple-50 border-purple-400 shadow-sm dark:bg-purple-950/30 dark:border-purple-600"
                                                                : "bg-background border-border"
                                                        )}
                                                    >
                                                        <div className="mt-0.5">
                                                            {isSelected ? (
                                                                <CheckCircle2 className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                                                            ) : (
                                                                <Circle className="h-4 w-4 text-muted-foreground" />
                                                            )}
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <div className="font-semibold text-sm">
                                                                {batch.name} ({batch.section})
                                                            </div>
                                                            <div className="text-xs text-muted-foreground mt-0.5">
                                                                Graduating {batch.graduationYear}
                                                            </div>
                                                        </div>
                                                    </button>
                                                );
                                            })}
                                    </div>
                                ) : (
                                    <div className="flex flex-col items-center justify-center text-center py-8 text-muted-foreground">
                                        <GraduationCap className="h-12 w-12 mb-2 opacity-20" />
                                        <p className="text-sm">
                                            No batches found for selected courses
                                        </p>
                                    </div>
                                )}
                            </ScrollArea>
                        </CardContent>
                    </Card>

                    {/* Individual Students - Collapsible */}
                    <Collapsible open={isStudentsOpen} onOpenChange={setIsStudentsOpen}>
                        <Card>
                            <CollapsibleTrigger asChild>
                                <CardHeader className="cursor-pointer hover:bg-green-50/50 dark:hover:bg-green-950/20 transition-colors py-3">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2.5">
                                            <div className="p-1.5 rounded-md bg-green-500/10 border border-green-500/20">
                                                <Users className="h-4 w-4 text-green-600 dark:text-green-400" />
                                            </div>
                                            <div>
                                                <CardTitle className="text-base">
                                                    Individual Students (Optional)
                                                </CardTitle>
                                                <CardDescription className="text-xs">
                                                    Add specific students not in selected batches
                                                </CardDescription>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            {getSelectedStudentCount() > 0 && (
                                                <Badge className="bg-green-500 hover:bg-green-600 text-xs">
                                                    {getSelectedStudentCount()} selected
                                                </Badge>
                                            )}
                                            <ChevronDown
                                                className={cn(
                                                    "h-4 w-4 transition-transform text-muted-foreground",
                                                    isStudentsOpen && "transform rotate-180"
                                                )}
                                            />
                                        </div>
                                    </div>
                                </CardHeader>
                            </CollapsibleTrigger>
                            <CollapsibleContent>
                                <CardContent className="pt-0">
                                    {data.courses.length === 0 ? (
                                        <div className="flex flex-col items-center justify-center text-center py-8 text-muted-foreground">
                                            <Users className="h-12 w-12 mb-2 opacity-20" />
                                            <p className="text-sm">Select courses first</p>
                                        </div>
                                    ) : (
                                        <div className="space-y-3">
                                            <div className="flex gap-2">
                                                <div className="relative flex-1">
                                                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                                                    <Input
                                                        placeholder="Search students..."
                                                        value={searchStudents}
                                                        onChange={(e) =>
                                                            setSearchStudents(e.target.value)
                                                        }
                                                        className="pl-8 h-8 text-sm"
                                                    />
                                                </div>
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={handleSelectAllStudents}
                                                    disabled={allStudentsSelected}
                                                    className="h-8 text-xs"
                                                >
                                                    <Check className="h-3 w-3 mr-1" />
                                                    All
                                                </Button>
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={handleDeselectAllStudents}
                                                    disabled={getSelectedStudentCount() === 0}
                                                    className="h-8 text-xs"
                                                >
                                                    <X className="h-3 w-3 mr-1" />
                                                    Clear
                                                </Button>
                                            </div>
                                            <ScrollArea className="h-64 pr-4">
                                                {filteredStudents.length > 0 ? (
                                                    <div className="space-y-1">
                                                        {filteredStudents.map(
                                                            (student: StudentInMap) => {
                                                                const isSelected =
                                                                    data.students.includes(
                                                                        student.id
                                                                    );
                                                                return (
                                                                    <button
                                                                        key={student.id}
                                                                        onClick={() =>
                                                                            handleStudentToggle(
                                                                                student.id
                                                                            )
                                                                        }
                                                                        className={cn(
                                                                            "w-full flex items-center gap-2 p-2.5 rounded-md border text-left transition-all",
                                                                            "hover:bg-green-50 hover:border-green-300 dark:hover:bg-green-950/30 dark:hover:border-green-700",
                                                                            isSelected &&
                                                                                "bg-green-50 border-green-400 dark:bg-green-950/30 dark:border-green-600"
                                                                        )}
                                                                    >
                                                                        {isSelected ? (
                                                                            <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400 shrink-0" />
                                                                        ) : (
                                                                            <Circle className="h-4 w-4 text-muted-foreground shrink-0" />
                                                                        )}
                                                                        <div className="flex-1 min-w-0">
                                                                            <div className="text-sm font-medium truncate">
                                                                                {student.name}
                                                                            </div>
                                                                            <div className="text-xs text-muted-foreground truncate">
                                                                                {student.email}
                                                                            </div>
                                                                        </div>
                                                                    </button>
                                                                );
                                                            }
                                                        )}
                                                    </div>
                                                ) : (
                                                    <div className="flex flex-col items-center justify-center text-center py-8 text-muted-foreground">
                                                        <Users className="h-10 w-10 mb-2 opacity-20" />
                                                        <p className="text-sm">
                                                            {searchStudents
                                                                ? "No students found matching your search"
                                                                : "No additional students available (all are in selected batches)"}
                                                        </p>
                                                    </div>
                                                )}
                                            </ScrollArea>
                                        </div>
                                    )}
                                </CardContent>
                            </CollapsibleContent>
                        </Card>
                    </Collapsible>

                    {/* Labs - Collapsible */}
                    <Collapsible open={isLabsOpen} onOpenChange={setIsLabsOpen}>
                        <Card>
                            <CollapsibleTrigger asChild>
                                <CardHeader className="cursor-pointer hover:bg-orange-50/50 dark:hover:bg-orange-950/20 transition-colors py-3">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2.5">
                                            <div className="p-1.5 rounded-md bg-orange-500/10 border border-orange-500/20">
                                                <MapPin className="h-4 w-4 text-orange-600 dark:text-orange-400" />
                                            </div>
                                            <div>
                                                <CardTitle className="text-base">
                                                    Lab Restrictions (Optional)
                                                </CardTitle>
                                                <CardDescription className="text-xs">
                                                    {data.labs.length === 0
                                                        ? "Quiz available from anywhere - click to restrict to specific labs"
                                                        : "Quiz restricted to selected labs"}
                                                </CardDescription>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            {data.labs.length > 0 ? (
                                                <Badge className="bg-orange-500 hover:bg-orange-600 text-xs">
                                                    {data.labs.length} selected
                                                </Badge>
                                            ) : (
                                                <Badge
                                                    variant="outline"
                                                    className="text-muted-foreground text-xs"
                                                >
                                                    No restriction
                                                </Badge>
                                            )}
                                            <ChevronDown
                                                className={cn(
                                                    "h-4 w-4 transition-transform text-muted-foreground",
                                                    isLabsOpen && "transform rotate-180"
                                                )}
                                            />
                                        </div>
                                    </div>
                                </CardHeader>
                            </CollapsibleTrigger>
                            <CollapsibleContent>
                                <CardContent className="pt-0">
                                    <div className="space-y-2.5">
                                        <div className="relative">
                                            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                                            <Input
                                                placeholder="Search labs..."
                                                value={searchLabs}
                                                onChange={(e) => setSearchLabs(e.target.value)}
                                                className="pl-8 h-8 text-sm"
                                            />
                                        </div>
                                        <ScrollArea className="h-64 pr-4">
                                            {isLoading ? (
                                                <div className="text-center text-sm text-muted-foreground py-8">
                                                    Loading labs...
                                                </div>
                                            ) : filteredLabs.length > 0 ? (
                                                <div className="space-y-1">
                                                    {filteredLabs.map((lab: LabResponse) => {
                                                        const isSelected = data.labs.includes(
                                                            lab.id
                                                        );
                                                        return (
                                                            <button
                                                                key={lab.id}
                                                                onClick={() =>
                                                                    handleLabToggle(lab.id)
                                                                }
                                                                className={cn(
                                                                    "w-full flex items-center gap-2 p-2.5 rounded-md border text-left transition-all",
                                                                    "hover:bg-orange-50 hover:border-orange-300 dark:hover:bg-orange-950/30 dark:hover:border-orange-700",
                                                                    isSelected &&
                                                                        "bg-orange-50 border-orange-400 dark:bg-orange-950/30 dark:border-orange-600"
                                                                )}
                                                            >
                                                                {isSelected ? (
                                                                    <CheckCircle2 className="h-4 w-4 text-orange-600 dark:text-orange-400 shrink-0" />
                                                                ) : (
                                                                    <Circle className="h-4 w-4 text-muted-foreground shrink-0" />
                                                                )}
                                                                <div className="flex-1 min-w-0">
                                                                    <div className="font-semibold text-sm">
                                                                        {lab.name}
                                                                    </div>
                                                                    {lab.block && (
                                                                        <div className="text-xs text-muted-foreground mt-0.5">
                                                                            Block {lab.block}
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            </button>
                                                        );
                                                    })}
                                                </div>
                                            ) : (
                                                <div className="flex flex-col items-center justify-center text-center py-8 text-muted-foreground">
                                                    <MapPin className="h-10 w-10 mb-2 opacity-20" />
                                                    <p className="text-sm">
                                                        {searchLabs
                                                            ? "No labs found matching your search"
                                                            : "No labs available"}
                                                    </p>
                                                </div>
                                            )}
                                        </ScrollArea>
                                    </div>
                                </CardContent>
                            </CollapsibleContent>
                        </Card>
                    </Collapsible>
                </div>
            </div>
        </TooltipProvider>
    );
}