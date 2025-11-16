"use client";

import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc/client";
import CourseList, { type Course } from "@/components/quiz/course-list";
import { useAnalytics } from "@/hooks/use-analytics";
import { AlertCircle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

type CourseType = "CORE" | "ELECTIVE" | "MICRO_CREDENTIAL";
type CourseStatus = "ACTIVE" | "INACTIVE";

export default function FacultyCoursesPage() {
    const { track } = useAnalytics();

    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize] = useState(12);
    const [searchTerm, setSearchTerm] = useState("");
    const [filterType, setFilterType] = useState<CourseType | "ALL">("ALL");
    const [filterStatus, setFilterStatus] = useState<CourseStatus | "ALL">("ACTIVE");

    const { data, isLoading, error } = trpc.facultyCourse.list.useQuery({
        searchTerm: searchTerm || undefined,
        type: filterType,
        isActive: filterStatus === "ALL" ? "ALL" : filterStatus,
        limit: pageSize,
        offset: (currentPage - 1) * pageSize,
    });

    // Track page view
    useEffect(() => {
        track("faculty_courses_page_viewed");
    }, [track]);

    const handleSearch = (search: string) => {
        setSearchTerm(search);
        setCurrentPage(1);
        track("faculty_courses_searched", { searchTerm: search });
    };

    const handleFilterType = (type: CourseType | "ALL") => {
        setFilterType(type);
        setCurrentPage(1);
        track("faculty_courses_filtered_by_type", { type });
    };

    const handleFilterStatus = (status: CourseStatus | "ALL") => {
        setFilterStatus(status);
        setCurrentPage(1);
        track("faculty_courses_filtered_by_status", { status });
    };

    const handlePageChange = (page: number) => {
        setCurrentPage(page);
        track("faculty_courses_page_changed", { page });
    };

    if (error) {
        return (
            <div className="container py-6">
                <Alert variant="destructive">
                    <AlertCircle className="size-4" />
                    <AlertTitle>Error loading courses</AlertTitle>
                    <AlertDescription>
                        {error.message || "Failed to load courses. Please try again later."}
                    </AlertDescription>
                </Alert>
            </div>
        );
    }

    const courses: Course[] = data?.courses || [];
    const total = data?.total || 0;

    return (
        <div className="container py-6">
            <div className="mb-6">
                <h1 className="text-3xl font-bold tracking-tight">My Courses</h1>
                <p className="text-muted-foreground mt-2">
                    View courses you teach as faculty or manage as a semester manager
                </p>
            </div>

            <CourseList
                courses={courses}
                total={total}
                isLoading={isLoading}
                currentPage={currentPage}
                pageSize={pageSize}
                onPageChange={handlePageChange}
                onSearch={handleSearch}
                onFilterType={handleFilterType}
                onFilterStatus={handleFilterStatus}
                searchTerm={searchTerm}
                filterType={filterType}
                filterStatus={filterStatus}
                basePath="/course"
            />
        </div>
    );
}
