"use client";

import React, { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { AnimatePresence, motion } from "framer-motion";
import { BookOpen, LayoutGrid, List, Search } from "lucide-react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Course } from "@/types/quiz";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

// Component that uses useSearchParams - will be wrapped in Suspense
function CourseContent() {
  const router = useRouter();
  const [courses, setCourses] = useState<Course[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Import useSearchParams inside this component
  const { useSearchParams } = require("next/navigation");
  const searchParams = useSearchParams();

  // Get initial values from URL search params
  const [viewMode, setViewMode] = useState<"table" | "grid">(
    (searchParams.get("view") as "table" | "grid") || "grid",
  );
  const [searchQuery, setSearchQuery] = useState(
    searchParams.get("search") || "",
  );
  const [sortField, setSortField] = useState<"code" | "name" | "quizzes">(
    (searchParams.get("sortBy") as "code" | "name" | "quizzes") || "code",
  );
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">(
    (searchParams.get("order") as "asc" | "desc") || "asc",
  );
  const [selectedClass, setSelectedClass] = useState<string>(
    searchParams.get("class") || "all",
  );

  // Function to update URL search params
  const updateSearchParams = (params: Record<string, string>) => {
    const newSearchParams = new URLSearchParams(searchParams.toString());

    Object.entries(params).forEach(([key, value]) => {
      if (value) {
        newSearchParams.set(key, value);
      } else {
        newSearchParams.delete(key);
      }
    });

    router.push(`?${newSearchParams.toString()}`, { scroll: false });
  };

  useEffect(() => {
    fetchCourses();
  }, []);

  // Update handlers to modify URL search params
  const handleViewModeChange = (value: string) => {
    const newMode = value as "table" | "grid";
    setViewMode(newMode);
    updateSearchParams({ view: newMode });
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchQuery(value);
    updateSearchParams({ search: value });
  };

  const handleSortFieldChange = (value: string) => {
    const newSortField = value as "code" | "name" | "quizzes";
    setSortField(newSortField);
    updateSearchParams({ sortBy: newSortField });
  };

  const handleSortDirectionToggle = () => {
    const newDirection = sortDirection === "asc" ? "desc" : "asc";
    setSortDirection(newDirection);
    updateSearchParams({ order: newDirection });
  };

  const handleClassChange = (value: string) => {
    setSelectedClass(value);
    updateSearchParams({ class: value });
  };

  const fetchCourses = async () => {
    try {
      setIsLoading(true);
      const response = await fetch("/api/staff/courses");
      if (!response.ok) throw new Error("Failed to fetch courses");
      const data = await response.json();
      setCourses(data);
    } catch (error) {
      console.error("Error:", error);
      toast.error("Failed to fetch courses");
    } finally {
      setIsLoading(false);
    }
  };

  const groupedAndFilteredCourses = useMemo(() => {
    let filtered = courses.filter((course) =>
      (course.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        course.code.toLowerCase().includes(searchQuery.toLowerCase())) &&
      (selectedClass === "all" || course.class.name === selectedClass)
    );

    filtered.sort((a, b) => {
      const direction = sortDirection === "asc" ? 1 : -1;
      switch (sortField) {
        case "code":
          return direction * a.code.localeCompare(b.code);
        case "name":
          return direction * a.name.localeCompare(b.name);
        case "quizzes":
          return direction *
            ((a._count?.quizzes || 0) - (b._count?.quizzes || 0));
        default:
          return 0;
      }
    });

    return filtered.reduce((groups, course) => {
      const className = course.class.name;
      if (!groups[className]) {
        groups[className] = [];
      }
      groups[className].push(course);
      return groups;
    }, {} as Record<string, Course[]>);
  }, [courses, searchQuery, selectedClass, sortField, sortDirection]);

  const uniqueClasses = useMemo(
    () => ["all", ...new Set(courses.map((course) => course.class.name))],
    [courses],
  );

  const handleCourseClick = (courseId: string) => {
    router.push(`/manager/quiz/${courseId}`);
  };

  const downloadReport = async (reportType: string, className: string) => {
    try {
      // Find the class ID from the class name
      const classObj = courses.find((course) =>
        course.class.name === className
      );
      if (!classObj) {
        toast.error("Class not found");
        return;
      }

      const classId = classObj.class.id;

      let payload = {};

      // Configure payload based on report type
      switch (reportType) {
        case "Daily":
          payload = {
            class_id: classId,
            exclude_dates: true,
            best_avg_count: 2,
            normalization_mark: 20,
            specific_dates: [
              "2025-03-17",
              "2025-03-18",
              "2025-03-24",
              "2025-03-25",
              "2025-03-26",
              "2025-03-27",
              "2025-03-28",
              "2025-03-29",
              "2025-04-01",
              "2025-04-02",
              "2025-04-03",
              "2025-04-04",
              "2025-04-07",
            ],
          };
          break;
        case "Major":
          payload = {
            class_id: classId,
            exclude_dates: false,
            best_avg_count: 4,
            normalization_mark: 30,
            specific_dates: [
              "2025-03-17",
              "2025-03-18",
              "2025-03-24",
              "2025-03-25",
              "2025-03-26",
              "2025-03-27",
              "2025-03-28",
              "2025-03-29",
              "2025-04-01",
              "2025-04-02",
              "2025-04-03",
              "2025-04-04",
              "2025-04-07",
            ],
          };
          break;
        case "Full":
        default:
          payload = {
            class_id: classId,
          };
          break;
      }

      // Show loading toast
      const toastId = toast.loading(`Generating ${reportType} report...`);

      // Make the API request
      const response = await fetch("http://172.17.9.74:4040/misc/class-report", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(`Failed to generate ${reportType} report`);
      }

      // Get the blob from the response
      const blob = await response.blob();

      // Create object URL for the blob
      const url = window.URL.createObjectURL(blob);

      // Create a download link and trigger it
      const a = document.createElement("a");
      a.href = url;
      a.download = `${className}-${reportType}-Report.xlsx`;
      document.body.appendChild(a);
      a.click();

      // Clean up
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      // Update toast to success
      toast.success(`${reportType} report downloaded successfully`, {
        id: toastId,
      });
    } catch (error) {
      console.error("Error downloading report:", error);
      toast.error(`Failed to download report: ${error.message}`);
    }
  };

  const renderFilterControls = () => (
    <div className="bg-white dark:bg-slate-800/50 rounded-lg shadow-md p-4 mb-6 backdrop-blur-sm">
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            placeholder="Search courses..."
            value={searchQuery}
            onChange={handleSearchChange}
            className="pl-9 dark:bg-gray-700"
          />
        </div>
        <Select value={selectedClass} onValueChange={handleClassChange}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Filter by class" />
          </SelectTrigger>
          <SelectContent>
            {uniqueClasses.map((className) => (
              <SelectItem key={className} value={className}>
                {className === "all" ? "All Classes" : className}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={sortField} onValueChange={handleSortFieldChange}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Sort by" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="code">Course Code</SelectItem>
            <SelectItem value="name">Course Name</SelectItem>
            <SelectItem value="quizzes">Quiz Count</SelectItem>
          </SelectContent>
        </Select>
        <Button
          variant="outline"
          onClick={handleSortDirectionToggle}
          className="w-[140px]"
        >
          {sortDirection === "asc" ? "↑ Ascending" : "↓ Descending"}
        </Button>
      </div>
    </div>
  );

  const renderGrid = () => (
    <div className="space-y-8">
      {isLoading
        ? (
          Array(6).fill(0).map((_, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="h-32 rounded-lg animate-pulse bg-slate-100 dark:bg-slate-800"
            />
          ))
        )
        : Object.entries(groupedAndFilteredCourses).length === 0
        ? (
          <div className="text-center py-12">
            <p className="text-xl text-gray-500 dark:text-gray-400">
              No courses found
            </p>
          </div>
        )
        : (
          Object.entries(groupedAndFilteredCourses).map((
            [className, classCourses],
          ) => (
            <div key={className} className="space-y-4">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-gray-800 dark:text-white pl-2 border-l-4 border-indigo-500">
                  {className}
                </h2>
                <div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline">Download Report</Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="w-56">
                      <DropdownMenuItem
                        onClick={() => downloadReport("Full", className)}
                      >
                        Full Report
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => downloadReport("Major", className)}
                      >
                        Major Evaluation Report
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => downloadReport("Daily", className)}
                      >
                        Minor Evaluation Report
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <AnimatePresence>
                  {classCourses.map((course) => (
                    <motion.div
                      key={course.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -20 }}
                      onClick={() => handleCourseClick(course.id)}
                      className="border dark:border-slate-700/50 rounded-lg p-6 hover:shadow-lg transition-all duration-200 cursor-pointer"
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="text-lg font-medium dark:text-white">
                            {course.code}
                          </h3>
                          <p className="text-base text-gray-600 dark:text-gray-400 mt-1">
                            {course.name}
                          </p>
                          <div className="flex gap-2 mt-3">
                            <span className="text-sm text-gray-500 dark:text-gray-500">
                              {course.class.department}
                            </span>
                            <span className="text-sm text-gray-400 dark:text-gray-600">
                              •
                            </span>
                            <span className="text-sm text-gray-500 dark:text-gray-500">
                              {course.class.name}
                            </span>
                          </div>
                        </div>
                        <div className="text-indigo-600 dark:text-indigo-400 text-sm font-medium px-3 py-1 rounded-full border border-indigo-200 dark:border-indigo-900/50">
                          {course._count?.quizzes || 0}{" "}
                          {course._count?.quizzes === 1 ? "Quiz" : "Quizzes"}
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            </div>
          ))
        )}
    </div>
  );

  const renderTable = () => (
    <div className="space-y-8">
      {isLoading
        ? (
          <div className="rounded-lg border dark:border-slate-700 bg-white dark:bg-slate-800/50 backdrop-blur-sm">
            {Array(5).fill(0).map((_, i) => (
              <TableRow key={i}>
                {Array(5).fill(0).map((_, j) => (
                  <TableCell key={j} className="py-4">
                    <div className="h-4 bg-slate-100 dark:bg-slate-800 rounded animate-pulse" />
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </div>
        )
        : Object.entries(groupedAndFilteredCourses).length === 0
        ? (
          <div className="text-center py-12">
            <p className="text-xl text-gray-500 dark:text-gray-400">
              No courses found
            </p>
          </div>
        )
        : (
          Object.entries(groupedAndFilteredCourses).map((
            [className, classCourses],
          ) => (
            <div key={className} className="space-y-4">
              <h2 className="text-xl font-semibold text-gray-800 dark:text-white pl-2 border-l-4 border-indigo-500">
                {className}
              </h2>
              <div className="rounded-lg border dark:border-slate-700/50">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-base py-4">
                        Course Code
                      </TableHead>
                      <TableHead className="text-base py-4">
                        Course Name
                      </TableHead>
                      <TableHead className="text-base py-4">
                        Department
                      </TableHead>
                      <TableHead className="text-base py-4 text-right">
                        Quizzes
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {classCourses.map((course) => (
                      <TableRow
                        key={course.id}
                        onClick={() => handleCourseClick(course.id)}
                        className="cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50"
                      >
                        <TableCell className="font-medium">
                          {course.code}
                        </TableCell>
                        <TableCell>{course.name}</TableCell>
                        <TableCell>{course.class.department}</TableCell>
                        <TableCell>{course.class.name}</TableCell>
                        <TableCell className="text-right">
                          <span className="text-indigo-600 dark:text-indigo-400 text-sm font-medium px-3 py-1 rounded-full border border-indigo-200 dark:border-indigo-900/50">
                            {course._count?.quizzes || 0}
                          </span>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          ))
        )}
    </div>
  );

  return (
    <>
      <header className="flex justify-between items-center mb-8">
        <div className="flex items-center gap-2">
          <BookOpen className="h-8 w-8 text-indigo-600" />
          <h1 className="text-4xl font-bold">Courses</h1>
        </div>
        <Tabs value={viewMode} onValueChange={handleViewModeChange}>
          <TabsList>
            <TabsTrigger value="table">
              <List className="h-4 w-4 mr-1" />
              Table
            </TabsTrigger>
            <TabsTrigger value="grid">
              <LayoutGrid className="h-4 w-4 mr-1" />
              Grid
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </header>

      {renderFilterControls()}

      <div className="rounded-lg p-6">
        {viewMode === "grid" ? renderGrid() : renderTable()}
      </div>
    </>
  );
}

// Loading fallback component
function CoursePageSkeleton() {
  return (
    <div className="min-h-screen p-8">
      <div className="max-w-[90rem] mx-auto">
        <header className="flex justify-between items-center mb-8">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 bg-slate-200 dark:bg-slate-700 rounded animate-pulse" />
            <div className="h-10 w-40 bg-slate-200 dark:bg-slate-700 rounded animate-pulse" />
          </div>
          <div className="h-10 w-32 bg-slate-200 dark:bg-slate-700 rounded animate-pulse" />
        </header>
        <div className="bg-white dark:bg-slate-800/50 rounded-lg shadow-md p-4 mb-6 h-16 animate-pulse" />
        <div className="rounded-lg p-6">
          {Array(3).fill(0).map((_, i) => (
            <div key={i} className="mb-8">
              <div className="h-6 w-32 bg-slate-200 dark:bg-slate-700 rounded mb-4 animate-pulse" />
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {Array(3).fill(0).map((_, j) => (
                  <div
                    key={j}
                    className="h-32 rounded-lg animate-pulse bg-slate-100 dark:bg-slate-800"
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// Main page component that wraps CourseContent in a Suspense boundary
export default function CoursesPage() {
  return (
    <div className="min-h-screen p-8">
      <div className="max-w-[90rem] mx-auto">
        <Suspense fallback={<CoursePageSkeleton />}>
          <CourseContent />
        </Suspense>
      </div>
    </div>
  );
}
