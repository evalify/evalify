"use client";

import { useMemo, useState } from "react";
import { trpc } from "@/lib/trpc/client";
import { useToast } from "@/hooks/use-toast";
import { useAnalytics } from "@/hooks/use-analytics";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { BookOpen, Filter, Plus, Search, Users, GraduationCap, UserCheck, X } from "lucide-react";
import { DataTable } from "@/components/admin/shared/data-table";
import { CourseForm } from "./course-form";
import { CourseInstructorsModal } from "./course-instructors-modal";
import { CourseStudentsModal } from "./course-students-modal";
import { CourseBatchesModal } from "./course-batches-modal";
import { SemesterManagersModal } from "../semesters/semester-managers-modal";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ConfirmationDialog } from "@/components/ui/custom-alert-dialog";

interface Course {
    id: string;
    name: string;
    description: string | null;
    code: string;
    image?: string | null;
    type: "CORE" | "ELECTIVE" | "MICRO_CREDENTIAL";
    semesterId: string;
    isActive: "ACTIVE" | "INACTIVE";
    createdAt: Date;
    updatedAt: Date | null;
    semesterName?: string | null;
    semesterYear?: number | null;
}

interface CourseManagementProps {
    semesterId?: string;
}

export function CourseManagement({ semesterId }: CourseManagementProps) {
    const [searchTerm, setSearchTerm] = useState("");
    const [statusFilter, setStatusFilter] = useState<"ALL" | "ACTIVE" | "INACTIVE">("ACTIVE");
    const [typeFilter, setTypeFilter] = useState<"ALL" | "CORE" | "ELECTIVE" | "MICRO_CREDENTIAL">(
        "ALL"
    );
    const [selectedSemester, setSelectedSemester] = useState<string | undefined>(semesterId);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);

    // Modal states for instructors, students, and batches
    const [isInstructorsModalOpen, setIsInstructorsModalOpen] = useState(false);
    const [isStudentsModalOpen, setIsStudentsModalOpen] = useState(false);
    const [isBatchesModalOpen, setIsBatchesModalOpen] = useState(false);
    const [selectedCourseForModal, setSelectedCourseForModal] = useState<string | null>(null);

    // Semester managers modal state
    const [isManagersModalOpen, setIsManagersModalOpen] = useState(false);
    const [managerSearchTerm, setManagerSearchTerm] = useState("");

    // Confirmation dialog states
    const [isDeleteCourseDialogOpen, setIsDeleteCourseDialogOpen] = useState(false);
    const [courseToDelete, setCourseToDelete] = useState<Course | null>(null);
    const [isRemoveManagerDialogOpen, setIsRemoveManagerDialogOpen] = useState(false);
    const [managerToRemove, setManagerToRemove] = useState<string | null>(null);

    const { track } = useAnalytics();
    const { success, error } = useToast();

    // Queries
    const coursesData = trpc.course.list.useQuery({
        searchTerm: searchTerm || undefined,
        semesterId: selectedSemester,
    });

    const semestersData = trpc.semester.list.useQuery({});

    const courses = useMemo(() => coursesData?.data?.courses || [], [coursesData.data?.courses]);

    const semesters = useMemo(
        () => semestersData?.data?.semesters || [],
        [semestersData.data?.semesters]
    );

    const activeSemesters = useMemo(
        () => semesters.filter((s) => s.isActive === "ACTIVE"),
        [semesters]
    );

    // Get semester details if semesterId is provided
    const { data: semesterData } = trpc.semester.get.useQuery(
        { id: semesterId || "" },
        { enabled: !!semesterId }
    );

    // Get managers for the semester
    const { data: managersData } = trpc.semester.getManagers.useQuery(
        { semesterId: semesterId || "" },
        { enabled: !!semesterId }
    );

    const managers = managersData || [];

    // Mutations
    const utils = trpc.useUtils();
    const createCourse = trpc.course.create.useMutation({
        onSuccess: () => {
            utils.course.list.invalidate();
            success("Course created successfully");
        },
        onError: (err) => {
            console.error("Create course error:", err);

            let errorMessage = "Failed to create course";

            if (err.message.includes("semester_id")) {
                errorMessage = "Invalid semester selected. Please choose a valid semester.";
            } else if (err.message.includes("duplicate") || err.message.includes("unique")) {
                errorMessage = "A course with this code already exists.";
            } else if (err.message.includes("foreign key")) {
                errorMessage = "The selected semester does not exist.";
            } else if (err.message) {
                errorMessage = err.message;
            }

            error(errorMessage);
        },
    });

    const updateCourse = trpc.course.update.useMutation({
        onSuccess: () => {
            utils.course.list.invalidate();
            success("Course updated successfully");
        },
        onError: (err) => {
            console.error("Update course error:", err);

            let errorMessage = "Failed to update course";

            if (err.message.includes("semester_id")) {
                errorMessage = "Invalid semester selected. Please choose a valid semester.";
            } else if (err.message.includes("duplicate") || err.message.includes("unique")) {
                errorMessage = "A course with this code already exists.";
            } else if (err.message.includes("foreign key")) {
                errorMessage = "The selected semester does not exist.";
            } else if (err.message.includes("not found")) {
                errorMessage = "Course not found. It may have been deleted.";
            } else if (err.message) {
                errorMessage = err.message;
            }

            error(errorMessage);
        },
    });

    const deleteCourse = trpc.course.delete.useMutation({
        onSuccess: () => {
            utils.course.list.invalidate();
            success("Course deleted successfully");
        },
        onError: (err) => {
            console.error("Delete course error:", err);

            let errorMessage = "Failed to delete course";

            if (err.message.includes("foreign key") || err.message.includes("constraint")) {
                errorMessage =
                    "Cannot delete course. It is associated with students, batches, instructors, or other data. Please remove those associations first.";
            } else if (err.message.includes("not found")) {
                errorMessage = "Course not found. It may have already been deleted.";
            } else if (err.message) {
                errorMessage = err.message;
            }

            error(errorMessage);
        },
    });

    const removeManager = trpc.semester.removeManager.useMutation({
        onSuccess: () => {
            if (semesterId) {
                utils.semester.getManagers.invalidate({ semesterId });
                utils.semester.getAvailableManagers.invalidate({ semesterId });
            }
            success("Manager removed from semester successfully");
        },
        onError: (err) => {
            console.error("Remove manager error:", err);
            error(err.message || "Failed to remove manager from semester");
        },
    });

    // Filter courses based on search, status, type, and semester
    const filteredCourses = useMemo(() => {
        let filtered = courses;

        if (searchTerm) {
            const lowerSearch = searchTerm.toLowerCase();
            filtered = filtered.filter(
                (course) =>
                    course.name.toLowerCase().includes(lowerSearch) ||
                    course.code.toLowerCase().includes(lowerSearch) ||
                    course.description?.toLowerCase().includes(lowerSearch)
            );
        }

        if (statusFilter !== "ALL") {
            filtered = filtered.filter((course) => course.isActive === statusFilter);
        }

        if (typeFilter !== "ALL") {
            filtered = filtered.filter((course) => course.type === typeFilter);
        }

        if (selectedSemester) {
            filtered = filtered.filter((course) => course.semesterId === selectedSemester);
        }

        return filtered;
    }, [courses, searchTerm, statusFilter, typeFilter, selectedSemester]);

    const handleCreate = async (data: {
        name: string;
        description: string;
        code: string;
        image?: string;
        type: "CORE" | "ELECTIVE" | "MICRO_CREDENTIAL";
        semesterId: string;
        isActive: "ACTIVE" | "INACTIVE";
    }) => {
        try {
            await createCourse.mutateAsync(data);
            setIsCreateModalOpen(false);
            track("course_created", {
                name: data.name,
                code: data.code,
                type: data.type,
                semesterId: data.semesterId,
            });
        } catch (err) {
            console.error("Error creating course:", err);
        }
    };

    const handleEdit = async (data: {
        name: string;
        description: string;
        code: string;
        image?: string;
        type: "CORE" | "ELECTIVE" | "MICRO_CREDENTIAL";
        semesterId: string;
        isActive: "ACTIVE" | "INACTIVE";
    }) => {
        if (!selectedCourse) return;

        try {
            await updateCourse.mutateAsync({
                id: selectedCourse.id,
                ...data,
            });
            setIsEditModalOpen(false);
            setSelectedCourse(null);
            track("course_updated", { id: selectedCourse.id, code: data.code });
        } catch (err) {
            console.error("Error updating course:", err);
        }
    };

    const handleDelete = async (course: Course) => {
        setCourseToDelete(course);
        setIsDeleteCourseDialogOpen(true);
    };

    const confirmDeleteCourse = async () => {
        if (!courseToDelete) return;

        try {
            await deleteCourse.mutateAsync({ id: courseToDelete.id });
            track("course_deleted", { id: courseToDelete.id, code: courseToDelete.code });
        } catch (err) {
            console.error("Error deleting course:", err);
        } finally {
            setIsDeleteCourseDialogOpen(false);
            setCourseToDelete(null);
        }
    };

    const openEditModal = (course: Course) => {
        setSelectedCourse(course);
        setIsEditModalOpen(true);
    };

    const openInstructorsModal = (course: Course) => {
        setSelectedCourseForModal(course.id);
        setIsInstructorsModalOpen(true);
        track("course_instructors_modal_opened", { courseId: course.id });
    };

    const openStudentsModal = (course: Course) => {
        setSelectedCourseForModal(course.id);
        setIsStudentsModalOpen(true);
        track("course_students_modal_opened", { courseId: course.id });
    };

    const openBatchesModal = (course: Course) => {
        setSelectedCourseForModal(course.id);
        setIsBatchesModalOpen(true);
        track("course_batches_modal_opened", { courseId: course.id });
    };

    const handleRemoveManager = async (managerId: string) => {
        if (!semesterId) return;

        setManagerToRemove(managerId);
        setIsRemoveManagerDialogOpen(true);
    };

    const confirmRemoveManager = async () => {
        if (!semesterId || !managerToRemove) return;

        try {
            await removeManager.mutateAsync({
                semesterId,
                managerId: managerToRemove,
            });
            track("semester_manager_removed", {
                semesterId,
                managerId: managerToRemove,
            });
        } catch (error) {
            console.error("Error removing manager:", error);
        } finally {
            setIsRemoveManagerDialogOpen(false);
            setManagerToRemove(null);
        }
    };

    const resetFilters = () => {
        setSearchTerm("");
        setStatusFilter("ALL");
        setTypeFilter("ALL");
        if (!semesterId) {
            setSelectedSemester(undefined);
        }
        track("course_filters_reset");
    };

    const getCourseTypeLabel = (type: string) => {
        switch (type) {
            case "CORE":
                return "Core";
            case "ELECTIVE":
                return "Elective";
            case "MICRO_CREDENTIAL":
                return "Micro Credential";
            default:
                return type;
        }
    };

    const getCourseTypeBadgeVariant = (type: string) => {
        switch (type) {
            case "CORE":
                return "default";
            case "ELECTIVE":
                return "secondary";
            case "MICRO_CREDENTIAL":
                return "outline";
            default:
                return "secondary";
        }
    };

    // Table columns
    const tableColumns = [
        {
            key: "name" as keyof Course,
            label: "Course",
            sortable: true,
            render: (_value: unknown, course: Course) => (
                <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-900">
                        <BookOpen className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div>
                        <div className="font-medium text-gray-900 dark:text-gray-100">
                            {course.name}
                        </div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">
                            {course.code}
                        </div>
                    </div>
                </div>
            ),
        },
        {
            key: "type" as keyof Course,
            label: "Type",
            render: (_value: unknown, course: Course) => (
                <Badge variant={getCourseTypeBadgeVariant(course.type)}>
                    {getCourseTypeLabel(course.type)}
                </Badge>
            ),
        },
        {
            key: "semesterName" as keyof Course,
            label: "Semester",
            render: (_value: unknown, course: Course) => (
                <div className="text-sm">
                    <div className="font-medium text-gray-900 dark:text-gray-100">
                        {course.semesterName || "N/A"}
                    </div>
                    {course.semesterYear && (
                        <div className="text-gray-500 dark:text-gray-400">
                            Year {course.semesterYear}
                        </div>
                    )}
                </div>
            ),
        },
        {
            key: "isActive" as keyof Course,
            label: "Status",
            render: (_value: unknown, course: Course) => (
                <Badge variant={course.isActive === "ACTIVE" ? "default" : "destructive"}>
                    {course.isActive}
                </Badge>
            ),
        },
        {
            key: "createdAt" as keyof Course,
            label: "Created",
            render: (_value: unknown, course: Course) => (
                <div className="text-sm text-gray-600 dark:text-gray-400">
                    {new Date(course.createdAt).toLocaleDateString()}
                </div>
            ),
        },
        {
            key: "actions" as keyof Course,
            label: "Quick Actions",
            render: (_value: unknown, course: Course) => (
                <div className="flex items-center gap-2">
                    <Button
                        onClick={(e) => {
                            e.stopPropagation();
                            openInstructorsModal(course);
                        }}
                        variant="outline"
                        size="sm"
                        className="flex items-center gap-1.5"
                        title="Manage Instructors"
                    >
                        <UserCheck className="h-3.5 w-3.5" />
                        <span className="hidden sm:inline">Instructors</span>
                    </Button>
                    <Button
                        onClick={(e) => {
                            e.stopPropagation();
                            openStudentsModal(course);
                        }}
                        variant="outline"
                        size="sm"
                        className="flex items-center gap-1.5"
                        title="Manage Students"
                    >
                        <Users className="h-3.5 w-3.5" />
                        <span className="hidden sm:inline">Students</span>
                    </Button>
                    <Button
                        onClick={(e) => {
                            e.stopPropagation();
                            openBatchesModal(course);
                        }}
                        variant="outline"
                        size="sm"
                        className="flex items-center gap-1.5"
                        title="Manage Batches"
                    >
                        <GraduationCap className="h-3.5 w-3.5" />
                        <span className="hidden sm:inline">Batches</span>
                    </Button>
                </div>
            ),
        },
    ];

    return (
        <div className="space-y-3">
            {/* Header Card */}
            <div className="border-0 shadow-none bg-transparent">
                <div className="px-0 pb-4">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                            <h2 className="text-2xl font-bold tracking-tight text-black dark:text-white">
                                {semesterId ? "Semester Courses" : "Courses"}
                            </h2>
                            <p className="text-muted-foreground">
                                {semesterId
                                    ? "Manage courses for this semester"
                                    : "Manage academic courses across all semesters"}
                            </p>
                        </div>
                        <Button
                            onClick={() => setIsCreateModalOpen(true)}
                            className="bg-black hover:bg-black/90 dark:bg-white dark:text-black dark:hover:bg-white/90"
                        >
                            <Plus className="h-4 w-4 mr-2" />
                            Create Course
                        </Button>
                    </div>
                </div>
            </div>

            {/* Semester Details Card - Only show when semesterId is provided */}
            {semesterId && semesterData && (
                <Card className="mb-6">
                    <CardContent className="p-4">
                        <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
                            {/* Left side - Semester Info (3/5 width) */}
                            <div className="lg:col-span-3 space-y-4">
                                <div>
                                    <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100">
                                        {semesterData.name}
                                    </h3>
                                    <p className="text-xs text-muted-foreground mt-1">
                                        Semester Overview & Statistics
                                    </p>
                                </div>

                                <div className="grid grid-cols-2 gap-x-12 gap-y-4 pt-2">
                                    <div className="space-y-1.5">
                                        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                                            Academic Year
                                        </p>
                                        <p className="text-base font-semibold text-gray-900 dark:text-gray-100">
                                            {semesterData.year}
                                        </p>
                                    </div>

                                    <div className="space-y-1.5">
                                        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                                            Department
                                        </p>
                                        <p className="text-base font-semibold text-gray-900 dark:text-gray-100">
                                            {semesterData.departmentName || "N/A"}
                                        </p>
                                    </div>

                                    <div className="space-y-1.5">
                                        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                                            Status
                                        </p>
                                        <div>
                                            <Badge
                                                variant={
                                                    semesterData.isActive === "ACTIVE"
                                                        ? "default"
                                                        : "destructive"
                                                }
                                                className="h-6 text-xs font-medium"
                                            >
                                                {semesterData.isActive}
                                            </Badge>
                                        </div>
                                    </div>

                                    <div className="space-y-1.5">
                                        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                                            Total Managers
                                        </p>
                                        <p className="text-base font-semibold text-gray-900 dark:text-gray-100">
                                            {managers.length}
                                        </p>
                                    </div>

                                    <div className="space-y-1.5">
                                        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                                            Total Courses
                                        </p>
                                        <p className="text-base font-semibold text-gray-900 dark:text-gray-100">
                                            {filteredCourses.length}
                                        </p>
                                    </div>

                                    <div className="space-y-1.5">
                                        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                                            Active Courses
                                        </p>
                                        <p className="text-base font-semibold text-gray-900 dark:text-gray-100">
                                            {
                                                filteredCourses.filter(
                                                    (c) => c.isActive === "ACTIVE"
                                                ).length
                                            }
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* Right side - Managers Section (2/5 width) */}
                            <div className="lg:col-span-2 border-l border-gray-200 dark:border-gray-800 pl-4">
                                <div className="flex items-center justify-between mb-2">
                                    <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                                        Managers ({managers.length})
                                    </h4>
                                    <Button
                                        onClick={() => {
                                            setIsManagersModalOpen(true);
                                            track("semester_managers_modal_opened", {
                                                semesterId,
                                            });
                                        }}
                                        size="sm"
                                        className="h-7 text-xs"
                                    >
                                        <Plus className="h-3 w-3 mr-1" />
                                        Add
                                    </Button>
                                </div>

                                <div className="relative mb-2.5">
                                    <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
                                    <input
                                        type="text"
                                        placeholder="Search managers..."
                                        value={managerSearchTerm}
                                        onChange={(e) => setManagerSearchTerm(e.target.value)}
                                        className="flex h-7 w-full rounded-md border border-input bg-background pl-8 pr-2 py-1 text-xs ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                                    />
                                </div>

                                {/* Scrollable Managers List */}
                                <ScrollArea className="h-[165px]">
                                    <div className="space-y-1.5 pr-3">
                                        {managers.length === 0 ? (
                                            <div className="flex flex-col items-center justify-center h-[165px] text-center">
                                                <UserCheck className="h-8 w-8 text-gray-300 dark:text-gray-700 mb-1.5" />
                                                <p className="text-xs text-muted-foreground">
                                                    No managers assigned
                                                </p>
                                            </div>
                                        ) : (
                                            managers
                                                .filter(
                                                    (manager) =>
                                                        !managerSearchTerm ||
                                                        manager.name
                                                            .toLowerCase()
                                                            .includes(
                                                                managerSearchTerm.toLowerCase()
                                                            ) ||
                                                        manager.email
                                                            .toLowerCase()
                                                            .includes(
                                                                managerSearchTerm.toLowerCase()
                                                            )
                                                )
                                                .map((manager) => (
                                                    <div
                                                        key={manager.id}
                                                        className="group flex items-center justify-between p-2 rounded-lg border border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                                                    >
                                                        <div className="flex items-center gap-2 min-w-0 flex-1">
                                                            <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-blue-100 dark:bg-blue-900">
                                                                <UserCheck className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
                                                            </div>
                                                            <div className="min-w-0 flex-1">
                                                                <div className="text-xs font-medium text-gray-900 dark:text-gray-100 truncate">
                                                                    {manager.name}
                                                                </div>
                                                                <div className="text-[10px] text-gray-500 dark:text-gray-400 truncate">
                                                                    {manager.email}
                                                                </div>
                                                            </div>
                                                        </div>
                                                        <Button
                                                            onClick={() =>
                                                                handleRemoveManager(manager.id)
                                                            }
                                                            variant="ghost"
                                                            size="sm"
                                                            className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity shrink-0 ml-1"
                                                        >
                                                            <X className="h-3 w-3 text-red-500" />
                                                        </Button>
                                                    </div>
                                                ))
                                        )}
                                    </div>
                                </ScrollArea>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Filters Card */}
            <Card className="mb-6">
                <CardHeader>
                    <div className="flex items-center gap-2">
                        <Filter className="h-5 w-5" />
                        <h3 className="text-lg font-semibold">Filters</h3>
                    </div>
                    <p className="text-sm text-muted-foreground">
                        Filter courses by name, code, type, semester, or status
                    </p>
                </CardHeader>
                <CardContent>
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Search</label>
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                                <input
                                    type="text"
                                    placeholder="Search courses..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="flex h-10 w-full rounded-md border border-input bg-background pl-9 pr-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                                />
                            </div>
                        </div>

                        {!semesterId && (
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Semester</label>
                                <select
                                    value={selectedSemester || ""}
                                    onChange={(e) =>
                                        setSelectedSemester(e.target.value || undefined)
                                    }
                                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                                >
                                    <option value="">All Semesters</option>
                                    {activeSemesters.map((semester) => (
                                        <option key={semester.id} value={semester.id}>
                                            {semester.name} ({semester.year})
                                        </option>
                                    ))}
                                </select>
                            </div>
                        )}

                        <div className="space-y-2">
                            <label className="text-sm font-medium">Type</label>
                            <select
                                value={typeFilter}
                                onChange={(e) => setTypeFilter(e.target.value as typeof typeFilter)}
                                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                            >
                                <option value="ALL">All Types</option>
                                <option value="CORE">Core</option>
                                <option value="ELECTIVE">Elective</option>
                                <option value="MICRO_CREDENTIAL">Micro Credential</option>
                            </select>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium">Status</label>
                            <select
                                value={statusFilter}
                                onChange={(e) =>
                                    setStatusFilter(e.target.value as typeof statusFilter)
                                }
                                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                            >
                                <option value="ALL">All Status</option>
                                <option value="ACTIVE">Active</option>
                                <option value="INACTIVE">Inactive</option>
                            </select>
                        </div>

                        <div className="flex items-end">
                            <Button variant="outline" onClick={resetFilters} className="w-full">
                                Reset Filters
                            </Button>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Data Table Card */}
            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <div>
                            <h3 className="text-lg font-semibold">Courses</h3>
                            <p className="text-sm text-muted-foreground">
                                {filteredCourses.length} of {courses.length} courses
                                {searchTerm && ` matching "${searchTerm}"`}
                            </p>
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    <DataTable
                        data={filteredCourses}
                        columns={tableColumns}
                        onEdit={openEditModal}
                        onDelete={handleDelete}
                        loading={coursesData.isLoading}
                    />
                </CardContent>
            </Card>

            {/* Create Modal */}
            <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
                <DialogContent className="sm:max-w-3xl">
                    <DialogHeader>
                        <DialogTitle>Create Course</DialogTitle>
                    </DialogHeader>
                    <CourseForm
                        semesters={activeSemesters}
                        fixedSemesterId={semesterId}
                        onSubmit={handleCreate}
                        onCancel={() => setIsCreateModalOpen(false)}
                    />
                </DialogContent>
            </Dialog>

            {/* Edit Modal */}
            <Dialog
                open={isEditModalOpen}
                onOpenChange={(open) => {
                    setIsEditModalOpen(open);
                    if (!open) setSelectedCourse(null);
                }}
            >
                <DialogContent className="sm:max-w-3xl">
                    <DialogHeader>
                        <DialogTitle>Edit Course</DialogTitle>
                    </DialogHeader>
                    <CourseForm
                        semesters={activeSemesters}
                        fixedSemesterId={semesterId}
                        initialData={
                            selectedCourse
                                ? {
                                      ...selectedCourse,
                                      image: selectedCourse.image || undefined,
                                  }
                                : null
                        }
                        onSubmit={handleEdit}
                        onCancel={() => {
                            setIsEditModalOpen(false);
                            setSelectedCourse(null);
                        }}
                    />
                </DialogContent>
            </Dialog>

            {/* Instructors Modal */}
            {selectedCourseForModal && (
                <Dialog
                    open={isInstructorsModalOpen}
                    onOpenChange={(open) => {
                        setIsInstructorsModalOpen(open);
                        if (!open) setSelectedCourseForModal(null);
                    }}
                >
                    <DialogContent className="sm:max-w-6xl">
                        <DialogHeader>
                            <DialogTitle>Manage Course Instructors</DialogTitle>
                        </DialogHeader>
                        <CourseInstructorsModal
                            courseId={selectedCourseForModal}
                            onClose={() => {
                                setIsInstructorsModalOpen(false);
                                setSelectedCourseForModal(null);
                            }}
                        />
                    </DialogContent>
                </Dialog>
            )}

            {/* Students Modal */}
            {selectedCourseForModal && (
                <Dialog
                    open={isStudentsModalOpen}
                    onOpenChange={(open) => {
                        setIsStudentsModalOpen(open);
                        if (!open) setSelectedCourseForModal(null);
                    }}
                >
                    <DialogContent className="sm:max-w-6xl">
                        <DialogHeader>
                            <DialogTitle>Manage Course Students</DialogTitle>
                        </DialogHeader>
                        <CourseStudentsModal
                            courseId={selectedCourseForModal}
                            onClose={() => {
                                setIsStudentsModalOpen(false);
                                setSelectedCourseForModal(null);
                            }}
                        />
                    </DialogContent>
                </Dialog>
            )}

            {/* Batches Modal */}
            {selectedCourseForModal && (
                <Dialog
                    open={isBatchesModalOpen}
                    onOpenChange={(open) => {
                        setIsBatchesModalOpen(open);
                        if (!open) setSelectedCourseForModal(null);
                    }}
                >
                    <DialogContent className="sm:max-w-6xl">
                        <DialogHeader>
                            <DialogTitle>Manage Course Batches</DialogTitle>
                        </DialogHeader>
                        <CourseBatchesModal
                            courseId={selectedCourseForModal}
                            onClose={() => {
                                setIsBatchesModalOpen(false);
                                setSelectedCourseForModal(null);
                            }}
                        />
                    </DialogContent>
                </Dialog>
            )}

            {/* Semester Managers Modal */}
            {semesterId && (
                <Dialog
                    open={isManagersModalOpen}
                    onOpenChange={(open) => {
                        setIsManagersModalOpen(open);
                    }}
                >
                    <DialogContent className="sm:max-w-4xl">
                        <DialogHeader>
                            <DialogTitle>Add Managers to Semester</DialogTitle>
                        </DialogHeader>
                        <SemesterManagersModal
                            semesterId={semesterId}
                            onClose={() => {
                                setIsManagersModalOpen(false);
                            }}
                        />
                    </DialogContent>
                </Dialog>
            )}

            {/* Delete Course Confirmation Dialog */}
            <ConfirmationDialog
                isOpen={isDeleteCourseDialogOpen}
                onOpenChange={setIsDeleteCourseDialogOpen}
                title="Delete Course"
                message={
                    courseToDelete
                        ? `Are you sure you want to delete "${courseToDelete.name} (${courseToDelete.code})"? This action cannot be undone.`
                        : "Are you sure you want to delete this course?"
                }
                onAccept={confirmDeleteCourse}
                confirmButtonText="Delete"
                cancelButtonText="Cancel"
            />

            {/* Remove Manager Confirmation Dialog */}
            <ConfirmationDialog
                isOpen={isRemoveManagerDialogOpen}
                onOpenChange={setIsRemoveManagerDialogOpen}
                title="Remove Manager"
                message="Are you sure you want to remove this manager from the semester?"
                onAccept={confirmRemoveManager}
                confirmButtonText="Remove"
                cancelButtonText="Cancel"
            />
        </div>
    );
}
