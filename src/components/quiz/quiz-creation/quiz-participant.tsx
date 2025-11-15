"use client";

import { useState, useMemo } from "react";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
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
} from "lucide-react";
import { trpc } from "@/lib/trpc/client";
import {
    QuizParticipantData,
    StudentDTO,
    CourseStudentInstructorDTO,
    BatchResponse,
    LabResponse,
    StudentInMap,
    StudentWithBatch,
} from "./types";
import { cn } from "@/lib/utils";

export interface QuizParticipantProps {
    data: QuizParticipantData;
    updateData: (data: QuizParticipantData) => void;
}

export function QuizParticipant({ data, updateData }: QuizParticipantProps) {
    const [searchStudents, setSearchStudents] = useState("");
    const [searchLabs, setSearchLabs] = useState("");
    const [searchBatches, setSearchBatches] = useState("");

    // Fetch courses
    const {
        data: coursesData,
        isLoading: coursesLoading,
        error: coursesError,
    } = trpc.facultyCourse.list.useQuery({
        isActive: "ACTIVE",
        limit: 100,
    });

    // Fetch students
    const {
        data: studentsData,
        isLoading: studentsLoading,
        error: studentsError,
    } = trpc.facultyCourse.getStudentsByInstructor.useQuery();

    // Fetch batches
    const {
        data: batchesData,
        isLoading: batchesLoading,
        error: batchesError,
    } = trpc.facultyCourse.getAllBatches.useQuery();

    // Fetch labs
    const {
        data: labsData,
        isLoading: labsLoading,
        error: labsError,
    } = trpc.facultyCourse.getAllLabs.useQuery();

    // Group students by batch
    const studentsByBatch = useMemo(() => {
        if (!studentsData || !batchesData) return new Map<string, StudentInMap[]>();

        const map = new Map<string, StudentInMap[]>();

        studentsData.forEach((courseData: CourseStudentInstructorDTO) => {
            courseData.students.forEach((student: StudentDTO) => {
                if (student.id && student.batchId) {
                    if (!map.has(student.batchId)) {
                        map.set(student.batchId, []);
                    }
                    const students = map.get(student.batchId)!;
                    if (!students.find((s: StudentInMap) => s.id === student.id)) {
                        students.push({
                            id: student.id,
                            name: student.name || "Unknown",
                            email: student.email || "",
                        });
                    }
                }
            });
        });

        return map;
    }, [studentsData, batchesData]);

    // Get batches for selected courses
    const batchesForSelectedCourses = useMemo(() => {
        if (!batchesData) return [];
        if (data.courses.length === 0) return batchesData; // Show all if no course selected

        const batchIds = new Set<string>();

        data.courses.forEach((courseId: string) => {
            const courseStudents = studentsData?.find(
                (cd: CourseStudentInstructorDTO) => cd.courseId === courseId
            );
            courseStudents?.students.forEach((student: StudentDTO) => {
                if (student.batchId) {
                    batchIds.add(student.batchId);
                }
            });
        });

        return batchesData.filter((batch: BatchResponse) => batchIds.has(batch.id));
    }, [batchesData, data.courses, studentsData]);

    // Get students from selected batches
    const studentsForSelectedBatches = useMemo(() => {
        const students: StudentWithBatch[] = [];

        data.batches.forEach((batchId: string) => {
            const batchStudents = studentsByBatch.get(batchId) || [];
            batchStudents.forEach((student: StudentInMap) => {
                students.push({ ...student, batchId });
            });
        });

        return students;
    }, [data.batches, studentsByBatch]);

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

    // Filter students
    const filteredStudents = useMemo(() => {
        if (!searchStudents) return studentsForSelectedBatches;

        const query = searchStudents.toLowerCase();
        return studentsForSelectedBatches.filter(
            (student: StudentWithBatch) =>
                student.name.toLowerCase().includes(query) ||
                student.email.toLowerCase().includes(query)
        );
    }, [studentsForSelectedBatches, searchStudents]);

    const handleCourseToggle = (courseId: string) => {
        const isSelected = data.courses.includes(courseId);

        if (isSelected) {
            // Deselect course and clear related batches/students
            const courseBatchIds = new Set<string>();
            const courseStudents = studentsData?.find(
                (cd: CourseStudentInstructorDTO) => cd.courseId === courseId
            );
            courseStudents?.students.forEach((s: StudentDTO) => {
                if (s.batchId) courseBatchIds.add(s.batchId);
            });

            updateData({
                ...data,
                courses: data.courses.filter((c: string) => c !== courseId),
                batches: data.batches.filter((b: string) => !courseBatchIds.has(b)),
                students: data.students.filter((studentId: string) => {
                    const student = studentsForSelectedBatches.find(
                        (s: StudentWithBatch) => s.id === studentId
                    );
                    return student && !courseBatchIds.has(student.batchId);
                }),
            });
        } else {
            updateData({
                ...data,
                courses: [...data.courses, courseId],
            });
        }
    };

    const handleBatchToggle = (batchId: string) => {
        const isSelected = data.batches.includes(batchId);

        if (isSelected) {
            // Deselect batch and remove its students
            const batchStudents = studentsByBatch.get(batchId) || [];
            const studentIds = batchStudents.map((s: StudentInMap) => s.id);

            updateData({
                ...data,
                batches: data.batches.filter((b: string) => b !== batchId),
                students: data.students.filter((s: string) => !studentIds.includes(s)),
            });
        } else {
            updateData({
                ...data,
                batches: [...data.batches, batchId],
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
        const allStudentIds = studentsForSelectedBatches.map((s: StudentWithBatch) => s.id);
        updateData({
            ...data,
            students: [...new Set([...data.students, ...allStudentIds])],
        });
    };

    const handleDeselectAllStudents = () => {
        const batchStudentIds = studentsForSelectedBatches.map((s: StudentWithBatch) => s.id);
        updateData({
            ...data,
            students: data.students.filter((s: string) => !batchStudentIds.includes(s)),
        });
    };

    const getTotalStudentCount = (): number => {
        return new Set(studentsForSelectedBatches.map((s: StudentWithBatch) => s.id)).size;
    };

    const getSelectedStudentCount = (): number => {
        const batchStudentIds = new Set(
            studentsForSelectedBatches.map((s: StudentWithBatch) => s.id)
        );
        return data.students.filter((s: string) => batchStudentIds.has(s)).length;
    };

    if (coursesError || studentsError || batchesError || labsError) {
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
                                    labsError?.message}
                            </p>
                        </div>
                    </div>
                </CardContent>
            </Card>
        );
    }

    const isLoading = coursesLoading || studentsLoading || batchesLoading || labsLoading;
    const allStudentsSelected =
        getSelectedStudentCount() === getTotalStudentCount() && getTotalStudentCount() > 0;

    return (
        <TooltipProvider>
            <div className="space-y-6">
                {/* Summary Bar */}
                <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg border">
                    <div className="flex items-center gap-6">
                        <div className="flex items-center gap-2">
                            <BookOpen className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm font-medium">
                                {data.courses.length} Courses
                            </span>
                        </div>
                        <div className="flex items-center gap-2">
                            <GraduationCap className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm font-medium">
                                {data.batches.length} Batches
                            </span>
                        </div>
                        <div className="flex items-center gap-2">
                            <MapPin className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm font-medium">{data.labs.length} Labs</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <Users className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm font-medium">
                                {getSelectedStudentCount()} Students
                            </span>
                        </div>
                    </div>
                </div>

                {/* Main Selection Area */}
                <div className="space-y-4">
                    {/* Step 1: Courses */}
                    <Card>
                        <CardHeader className="pb-3">
                            <div className="flex items-center justify-between">
                                <CardTitle className="flex items-center gap-2 text-base">
                                    <div className="flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-bold">
                                        1
                                    </div>
                                    <BookOpen className="h-4 w-4" />
                                    Select Courses
                                    {data.courses.length === 0 && (
                                        <Badge variant="destructive" className="ml-2 text-xs">
                                            Required
                                        </Badge>
                                    )}
                                </CardTitle>
                                {data.courses.length > 0 && (
                                    <Badge variant="secondary" className="text-xs">
                                        {data.courses.length} selected
                                    </Badge>
                                )}
                            </div>
                            <CardDescription className="text-xs">
                                Select one or more courses to start
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <ScrollArea className="h-[120px] pr-4">
                                {isLoading ? (
                                    <div className="text-center text-sm text-muted-foreground py-8">
                                        Loading...
                                    </div>
                                ) : coursesData?.courses && coursesData.courses.length > 0 ? (
                                    <div className="flex flex-wrap gap-2">
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
                                                            "inline-flex items-center gap-2 px-3 py-2 rounded-lg border text-sm transition-all",
                                                            "hover:bg-accent",
                                                            isSelected
                                                                ? "bg-primary/10 border-primary/50 hover:bg-primary/15"
                                                                : "bg-background border-border"
                                                        )}
                                                    >
                                                        {isSelected ? (
                                                            <Check className="h-3 w-3 text-primary" />
                                                        ) : (
                                                            <Circle className="h-3 w-3 text-muted-foreground" />
                                                        )}
                                                        <div className="text-left">
                                                            <div className="font-medium leading-none">
                                                                {course.code}
                                                            </div>
                                                            <div className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
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

                    {/* Step 2: Batches */}
                    <Card
                        className={cn(
                            data.courses.length > 0 && data.batches.length === 0 && "border-primary"
                        )}
                    >
                        <CardHeader className="pb-3">
                            <div className="flex items-center justify-between">
                                <CardTitle className="flex items-center gap-2 text-base">
                                    <div
                                        className={cn(
                                            "flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold",
                                            data.courses.length > 0
                                                ? "bg-primary text-primary-foreground"
                                                : "bg-muted text-muted-foreground"
                                        )}
                                    >
                                        2
                                    </div>
                                    <GraduationCap className="h-4 w-4" />
                                    Select Batches
                                    <Tooltip>
                                        <TooltipTrigger asChild>
                                            <AlertCircle className="h-3 w-3 text-muted-foreground ml-1" />
                                        </TooltipTrigger>
                                        <TooltipContent className="max-w-xs">
                                            <p>
                                                Batches are filtered based on your selected courses.
                                                Only batches containing students enrolled in the
                                                selected courses will appear.
                                            </p>
                                        </TooltipContent>
                                    </Tooltip>
                                </CardTitle>
                                {data.batches.length > 0 && (
                                    <Badge variant="secondary" className="text-xs">
                                        {data.batches.length} selected
                                    </Badge>
                                )}
                            </div>
                            <CardDescription className="text-xs">
                                {data.courses.length === 0
                                    ? "Select courses first to view batches"
                                    : "Select batches from the selected courses"}
                            </CardDescription>
                            {data.courses.length > 0 && batchesForSelectedCourses.length > 0 && (
                                <div className="relative mt-2">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
                                    <Input
                                        placeholder="Search batches..."
                                        value={searchBatches}
                                        onChange={(e) => setSearchBatches(e.target.value)}
                                        className="pl-9 h-8 text-xs"
                                    />
                                </div>
                            )}
                        </CardHeader>
                        <CardContent>
                            <ScrollArea className="h-[120px] pr-4">
                                {data.courses.length === 0 ? (
                                    <div className="text-center text-sm text-muted-foreground py-8">
                                        Select courses first
                                    </div>
                                ) : batchesForSelectedCourses.length > 0 ? (
                                    <div className="flex flex-wrap gap-2">
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
                                                const studentCount =
                                                    studentsByBatch.get(batch.id)?.length || 0;
                                                return (
                                                    <button
                                                        key={batch.id}
                                                        onClick={() => handleBatchToggle(batch.id)}
                                                        className={cn(
                                                            "inline-flex items-center gap-2 px-3 py-2 rounded-lg border text-sm transition-all",
                                                            "hover:bg-accent",
                                                            isSelected
                                                                ? "bg-primary/10 border-primary/50 hover:bg-primary/15"
                                                                : "bg-background border-border"
                                                        )}
                                                    >
                                                        {isSelected ? (
                                                            <Check className="h-3 w-3 text-primary" />
                                                        ) : (
                                                            <Circle className="h-3 w-3 text-muted-foreground" />
                                                        )}
                                                        <div className="text-left">
                                                            <div className="font-medium leading-none">
                                                                {batch.name} ({batch.section})
                                                            </div>
                                                            <div className="text-xs text-muted-foreground mt-0.5">
                                                                {batch.graduationYear} •{" "}
                                                                {studentCount} students
                                                            </div>
                                                        </div>
                                                    </button>
                                                );
                                            })}
                                    </div>
                                ) : (
                                    <div className="text-center text-sm text-muted-foreground py-8">
                                        No batches found for selected courses
                                    </div>
                                )}
                            </ScrollArea>
                        </CardContent>
                    </Card>

                    {/* Step 3 & 4: Labs and Students in Grid */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        {/* Labs */}
                        <Card>
                            <CardHeader className="pb-3">
                                <div className="flex items-center justify-between">
                                    <CardTitle className="flex items-center gap-2 text-base">
                                        <div className="flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-bold">
                                            3
                                        </div>
                                        <MapPin className="h-4 w-4" />
                                        Select Labs
                                        <Tooltip>
                                            <TooltipTrigger asChild>
                                                <AlertCircle className="h-3 w-3 text-muted-foreground ml-1" />
                                            </TooltipTrigger>
                                            <TooltipContent className="max-w-xs">
                                                <p>
                                                    Specify which computer labs this quiz can be
                                                    taken in. Leave empty to allow quiz from any
                                                    location.
                                                </p>
                                            </TooltipContent>
                                        </Tooltip>
                                    </CardTitle>
                                    {data.labs.length > 0 && (
                                        <Badge variant="secondary" className="text-xs">
                                            {data.labs.length} selected
                                        </Badge>
                                    )}
                                </div>
                                <CardDescription className="text-xs">
                                    Optional: Choose labs for the quiz
                                </CardDescription>
                                <div className="relative mt-2">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
                                    <Input
                                        placeholder="Search labs..."
                                        value={searchLabs}
                                        onChange={(e) => setSearchLabs(e.target.value)}
                                        className="pl-9 h-8 text-xs"
                                    />
                                </div>
                            </CardHeader>
                            <CardContent>
                                <ScrollArea className="h-[280px] pr-4">
                                    {isLoading ? (
                                        <div className="text-center text-sm text-muted-foreground py-8">
                                            Loading...
                                        </div>
                                    ) : filteredLabs.length > 0 ? (
                                        <div className="space-y-1">
                                            {filteredLabs.map((lab: LabResponse) => {
                                                const isSelected = data.labs.includes(lab.id);
                                                return (
                                                    <div
                                                        key={lab.id}
                                                        onClick={() => handleLabToggle(lab.id)}
                                                        className={cn(
                                                            "flex items-center gap-3 p-2.5 rounded-lg cursor-pointer transition-all",
                                                            "hover:bg-accent",
                                                            isSelected &&
                                                                "bg-primary/10 border border-primary/20"
                                                        )}
                                                    >
                                                        <Checkbox
                                                            checked={isSelected}
                                                            className="mt-0"
                                                        />
                                                        <div className="flex-1">
                                                            <div className="font-medium text-sm">
                                                                {lab.name}
                                                            </div>
                                                            {lab.block && (
                                                                <div className="text-xs text-muted-foreground">
                                                                    Block {lab.block}
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    ) : (
                                        <div className="text-center text-sm text-muted-foreground py-8">
                                            {searchLabs ? "No labs found" : "No labs available"}
                                        </div>
                                    )}
                                </ScrollArea>
                            </CardContent>
                        </Card>

                        {/* Students */}
                        <Card>
                            <CardHeader className="pb-3">
                                <div className="flex items-center justify-between">
                                    <CardTitle className="flex items-center gap-2 text-base">
                                        <div
                                            className={cn(
                                                "flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold",
                                                data.batches.length > 0
                                                    ? "bg-primary text-primary-foreground"
                                                    : "bg-muted text-muted-foreground"
                                            )}
                                        >
                                            4
                                        </div>
                                        <Users className="h-4 w-4" />
                                        Select Students
                                        <Tooltip>
                                            <TooltipTrigger asChild>
                                                <AlertCircle className="h-3 w-3 text-muted-foreground ml-1" />
                                            </TooltipTrigger>
                                            <TooltipContent className="max-w-xs">
                                                <p>
                                                    Select individual students or use &quot;Select
                                                    All&quot; to include all students from the
                                                    chosen batches.
                                                </p>
                                            </TooltipContent>
                                        </Tooltip>
                                    </CardTitle>
                                    <Badge variant="secondary" className="text-xs">
                                        {getSelectedStudentCount()} / {getTotalStudentCount()}
                                    </Badge>
                                </div>
                                <CardDescription className="text-xs">
                                    {data.batches.length === 0
                                        ? "Select batches first to view students"
                                        : "Select specific students or use Select All"}
                                </CardDescription>
                                {data.batches.length > 0 && (
                                    <div className="space-y-2 mt-2">
                                        <div className="relative">
                                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
                                            <Input
                                                placeholder="Search students..."
                                                value={searchStudents}
                                                onChange={(e) => setSearchStudents(e.target.value)}
                                                className="pl-9 h-8 text-xs"
                                            />
                                        </div>
                                        <div className="flex gap-2">
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={handleSelectAllStudents}
                                                disabled={allStudentsSelected}
                                                className="flex-1 h-7 text-xs"
                                            >
                                                <Check className="h-3 w-3 mr-1" />
                                                Select All
                                            </Button>
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={handleDeselectAllStudents}
                                                disabled={getSelectedStudentCount() === 0}
                                                className="flex-1 h-7 text-xs"
                                            >
                                                <X className="h-3 w-3 mr-1" />
                                                Clear
                                            </Button>
                                        </div>
                                    </div>
                                )}
                            </CardHeader>
                            <CardContent>
                                <ScrollArea className="h-56 pr-4">
                                    {data.batches.length === 0 ? (
                                        <div className="text-center text-sm text-muted-foreground py-8">
                                            Select batches first
                                        </div>
                                    ) : filteredStudents.length > 0 ? (
                                        <div className="space-y-1">
                                            {filteredStudents.map((student: StudentWithBatch) => {
                                                const isSelected = data.students.includes(
                                                    student.id
                                                );
                                                return (
                                                    <div
                                                        key={student.id}
                                                        onClick={() =>
                                                            handleStudentToggle(student.id)
                                                        }
                                                        className={cn(
                                                            "flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-all group",
                                                            "hover:bg-accent",
                                                            isSelected && "bg-primary/10"
                                                        )}
                                                    >
                                                        {isSelected ? (
                                                            <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
                                                        ) : (
                                                            <Circle className="h-4 w-4 text-muted-foreground shrink-0" />
                                                        )}
                                                        <div className="flex-1 min-w-0">
                                                            <div className="text-sm font-medium truncate group-hover:text-primary transition-colors">
                                                                {student.name}
                                                            </div>
                                                            <div className="text-xs text-muted-foreground truncate">
                                                                {student.email}
                                                            </div>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    ) : (
                                        <div className="text-center text-sm text-muted-foreground py-8">
                                            {searchStudents
                                                ? "No students found"
                                                : "No students in selected batches"}
                                        </div>
                                    )}
                                </ScrollArea>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </div>
        </TooltipProvider>
    );
}
