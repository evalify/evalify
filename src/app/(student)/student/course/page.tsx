"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Search,
  BookOpen,
  Users,
  Calendar,
  LayoutGrid,
  List,
  SlidersHorizontal,
  ArrowUpDown,
  CheckCircle,
  Clock,
  GraduationCap,
  Filter,
  ChevronRight,
  AlertTriangle
} from "lucide-react";
import { toast } from "sonner";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { useTheme } from "next-themes";

interface Course {
  id: string;
  name: string;
  code: string;
  description?: string;
  semester?: number;
  isactive: boolean;
  staffId: string;
  classId: string;
  createdAt: string;
  updatedAt: string;
  class: {
    id: string;
    name: string;
  };
  staff?: {
    id: string;
    name: string;
  };
}

interface CourseQuizzes {
  courseId: string;
  courseName: string;
  courseCode: string;
  quizzes: {
    id: string;
    title: string;
    score?: number;
    totalScore?: number;
    normalizedScore?: number;
    status: 'live' | 'upcoming' | 'completed' | 'missed';
    quizNumber: number;
  }[];
  performance: number; // Average performance percentage
  color: string;
}

export default function CoursesPage() {
  const router = useRouter();
  const [courses, setCourses] = useState<Course[]>([]);
  const [filteredCourses, setFilteredCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState("name");
  const [filterSemester, setFilterSemester] = useState("all");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [performanceData, setPerformanceData] = useState<CourseQuizzes[]>([]);
  const [chartLoading, setChartLoading] = useState(true);
  const { theme } = useTheme();

  const colors = [
    "#3498db", // Blue
    "#e74c3c", // Red
    "#2ecc71", // Green
    "#f39c12", // Orange
    "#9b59b6", // Purple
    "#1abc9c", // Teal
    "#d35400", // Burnt Orange
    "#34495e", // Dark Blue
    "#16a085", // Green Blue
    "#c0392b", // Dark Red
    "#8e44ad", // Dark Purple
    "#27ae60"  // Emerald
  ];

  useEffect(() => {
    fetchCourses();
  }, []);

  useEffect(() => {
    applyFiltersAndSort();
  }, [courses, searchQuery, sortBy, filterSemester]);

  const fetchCourses = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/student/courses");
      
      if (!response.ok) {
        throw new Error("Failed to fetch courses");
      }

      const data = await response.json();
      setCourses(data);
      
      // After fetching courses, fetch quiz performance data for each course
      if (data.length > 0) {
        await fetchAllCoursesQuizData(data);
      }
    } catch (error) {
      console.error("Error fetching courses:", error);
      toast.error("Failed to load courses. Please try again later.");
    } finally {
      setLoading(false);
    }
  };

  const fetchAllCoursesQuizData = async (courseList: Course[]) => {
    try {
      setChartLoading(true);
      const courseDataPromises = courseList.map(async (course, index) => {
        try {
          const response = await fetch(`/api/student/courses/${course.id}/quizzes`);
          
          if (!response.ok) {
            return null;
          }
          
          const quizzes = await response.json();
          
          // Only include completed quizzes with showResult true and missed quizzes
          const processedQuizzes = quizzes
            .filter((quiz: any) => 
              (quiz.status === 'completed' && quiz.showResult) || quiz.status === 'missed'
            )
            .map((quiz: any, quizIndex: number) => ({
              id: quiz.id,
              title: quiz.title,
              score: quiz.status === 'missed' ? 0 : quiz.score || 0,
              totalScore: quiz.totalScore || 100,
              normalizedScore: quiz.status === 'missed' ? 0 : ((quiz.score || 0) / (quiz.totalScore || 100)) * 100,
              status: quiz.status,
              showResult: quiz.showResult,
              quizNumber: quizIndex + 1
            }));
            
          // Calculate average using only quizzes with showResult true or missed status
          const avgPerformance = processedQuizzes.length > 0 
            ? processedQuizzes.reduce((sum, q) => sum + q.normalizedScore, 0) / processedQuizzes.length
            : 0;
            
          return {
            courseId: course.id,
            courseName: course.name,
            courseCode: course.code,
            quizzes: processedQuizzes,
            performance: parseFloat(avgPerformance.toFixed(2)),
            color: colors[index % colors.length],
            totalAttempted: processedQuizzes.length
          };
        } catch (error) {
          console.error(`Error fetching quizzes for course ${course.id}:`, error);
          return null;
        }
      });
      
      const coursesData = await Promise.all(courseDataPromises);
      setPerformanceData(coursesData.filter(Boolean) as CourseQuizzes[]);
    } catch (error) {
      console.error("Error fetching all courses quiz data:", error);
    } finally {
      setChartLoading(false);
    }
  };

  const applyFiltersAndSort = () => {
    let filtered = [...courses];

    // Apply search filter
    if (searchQuery) {
      filtered = filtered.filter(
        (course) =>
          course.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          course.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
          course.description?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Apply semester filter
    if (filterSemester !== "all") {
      filtered = filtered.filter((course) => course.semester?.toString() === filterSemester);
    }

    // Apply sorting
    filtered.sort((a, b) => {
      switch (sortBy) {
        case "name":
          return a.name.localeCompare(b.name);
        case "name_desc":
          return b.name.localeCompare(a.name);
        case "code":
          return a.code.localeCompare(b.code);
        case "semester_asc":
          return (a.semester || 0) - (b.semester || 0);
        case "semester_desc":
          return (b.semester || 0) - (a.semester || 0);
        case "recent":
          return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
        default:
          return a.name.localeCompare(b.name);
      }
    });

    setFilteredCourses(filtered);
  };

  // Prepare data for the performance chart
  const prepareChartData = () => {
    if (!performanceData.length) return [];
    
    // Find the max quiz number across all courses for x-axis
    const maxQuizzes = Math.max(...performanceData.map(
      c => c.quizzes.length > 0 ? Math.max(...c.quizzes.map(q => q.quizNumber)) : 0
    ));
    
    // Create a data point for each quiz number
    const chartData = [];
    for (let i = 1; i <= maxQuizzes; i++) {
      const dataPoint: any = { quizNumber: `Quiz ${i}` };
      
      performanceData.forEach(course => {
        const quiz = course.quizzes.find(q => q.quizNumber === i);
        if (quiz) {
          dataPoint[course.courseCode] = quiz.normalizedScore;
        } else {
          dataPoint[course.courseCode] = null; // No quiz for this number in this course
        }
      });
      
      chartData.push(dataPoint);
    }
    
    return chartData;
  };
  
  const chartData = prepareChartData();

  // Apply filters to performance data
  const getFilteredPerformanceData = () => {
    if (!performanceData.length) return [];
    
    let filtered = [...performanceData];
    
    // Apply search filter
    if (searchQuery) {
      filtered = filtered.filter(
        (course) =>
          course.courseName.toLowerCase().includes(searchQuery.toLowerCase()) ||
          course.courseCode.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    
    // Apply semester filter using the courses data
    if (filterSemester !== "all") {
      const coursesInSemester = courses
        .filter(c => c.semester?.toString() === filterSemester)
        .map(c => c.id);
      filtered = filtered.filter(course => coursesInSemester.includes(course.courseId));
    }
    
    // Apply sorting
    filtered.sort((a, b) => {
      switch (sortBy) {
        case "name":
          return a.courseName.localeCompare(b.courseName);
        case "name_desc":
          return b.courseName.localeCompare(a.courseName);
        case "code":
          return a.courseCode.localeCompare(b.courseCode);
        case "performance_high":
          return b.performance - a.performance;
        case "performance_low":
          return a.performance - b.performance;
        case "quizzes":
          return b.totalAttempted - a.totalAttempted;
        default:
          return a.courseName.localeCompare(b.courseName);
      }
    });
    
    return filtered;
  };

  // Remove renderGrid() and renderList() functions as they won't be needed

  const renderPerformanceChart = () => {
    if (chartLoading) {
      return (
        <div className="w-full h-[300px] flex items-center justify-center">
          <Skeleton className="w-full h-full rounded-lg" />
        </div>
      );
    }

    if (!performanceData.length || !chartData.length) {
      return (
        <div className="w-full h-[300px] flex flex-col items-center justify-center border border-dashed rounded-lg p-6 bg-muted/30">
          <AlertTriangle className="h-12 w-12 text-muted-foreground mb-2" />
          <h3 className="text-lg font-medium text-center">No performance data available</h3>
          <p className="text-sm text-muted-foreground text-center mt-2">
            Complete quizzes in your courses to see your performance analytics
          </p>
        </div>
      );
    }

    const filteredPerformanceData = getFilteredPerformanceData();

    return (
      <div className="w-full">
        <ResponsiveContainer width="100%" height={350}>
          <LineChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid 
              strokeDasharray="3 3" 
              stroke={theme === "dark" ? "#333333" : "#efefef"} 
            />
            <XAxis 
              dataKey="quizNumber" 
              stroke={theme === "dark" ? "#ffffff" : "#000000"}
            />
            <YAxis 
              domain={[0, 100]} 
              tickFormatter={(value) => `${value}%`} 
              stroke={theme === "dark" ? "#ffffff" : "#000000"}
            />
            <Tooltip 
              formatter={(value, name) => {
                const courseCode = name
                const course = performanceData.find(c => c.courseCode === courseCode);
                return [`${value.toFixed(2)}%`, course ? course.courseName : courseCode];
              }} 
              labelFormatter={(value) => `${value}`}
              contentStyle={{
                backgroundColor: theme === "dark" ? '#1a1a1a' : '#ffffff',
                border: `1px solid ${theme === "dark" ? '#333333' : '#e5e5e5'}`,
                borderRadius: '6px',
                color: theme === "dark" ? '#ffffff' : '#000000',
              }}
              itemStyle={{
                color: theme === "dark" ? '#ffffff' : '#000000',
              }}
              labelStyle={{
                color: theme === "dark" ? '#ffffff' : '#000000',
              }}
            />
            {filteredPerformanceData.map((course) => (
              <Line
                key={course.courseId}
                type="monotone"
                dataKey={course.courseCode}
                name={`${course.courseCode} - ${course.courseName}`}
                stroke={course.color}
                activeDot={{ r: 8 }}
                connectNulls={true}
                strokeWidth={2}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
        
        {/* Enhanced Course Performance Summary with Search and Filter */}
        <div className="mt-6 mb-4">
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center mb-6">
            <div className="relative w-full sm:w-auto sm:flex-1">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Search courses by name or code..."
                className="pl-9 w-full"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            <div className="flex flex-wrap gap-2 w-full sm:w-auto">
              <Select value={filterSemester} onValueChange={setFilterSemester}>
                <SelectTrigger className="w-full sm:w-[160px]">
                  <div className="flex items-center">
                    <Filter className="mr-2 h-4 w-4" />
                    <SelectValue placeholder="Filter semester" />
                  </div>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Semesters</SelectItem>
                  {Array.from({ length: 8 }, (_, i) => (
                    <SelectItem key={i + 1} value={(i + 1).toString()}>
                      Semester {i + 1}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="w-full sm:w-[180px]">
                  <div className="flex items-center">
                    <ArrowUpDown className="mr-2 h-4 w-4" />
                    <SelectValue placeholder="Sort by" />
                  </div>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="name">Name (A-Z)</SelectItem>
                  <SelectItem value="name_desc">Name (Z-A)</SelectItem>
                  <SelectItem value="code">Course Code</SelectItem>
                  <SelectItem value="performance_high">Performance (High to Low)</SelectItem>
                  <SelectItem value="performance_low">Performance (Low to High)</SelectItem>
                  <SelectItem value="quizzes">Number of Quizzes</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          
          {filteredPerformanceData.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <BookOpen className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-xl font-semibold">No courses found</h3>
              <p className="text-muted-foreground mt-2">
                Try adjusting your search or filters
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredPerformanceData.map((course) => (
                <Card 
                  key={course.courseId} 
                  className="border-l-4 hover:shadow-md transition-all cursor-pointer" 
                  style={{ borderLeftColor: course.color }}
                  onClick={() => router.push(`/student/course/${course.courseId}`)}
                >
                  <CardContent className="p-4">
                    <div className="flex justify-between items-center">
                      <div>
                        <h4 className="font-medium">{course.courseCode}</h4>
                        <p className="text-sm text-muted-foreground">{course.courseName}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {course.totalAttempted} Quiz{course.totalAttempted !== 1 ? 'zes' : ''} Completed
                        </p>
                      </div>
                      <div className="text-right">
                        <Badge variant={course.performance >= 60 ? "default" : "destructive"}>
                          {course.performance}%
                        </Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="container py-8">
      <div className="flex flex-col gap-6">
        <header>
          <h1 className="text-3xl font-bold tracking-tight">My Courses</h1>
          <p className="text-muted-foreground mt-2">
            Browse and access all your enrolled courses
          </p>
        </header>

        {/* Performance Overview Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-xl">Performance Overview</CardTitle>
            <CardDescription>Your quiz scores across all courses</CardDescription>
          </CardHeader>
          <CardContent>
            {renderPerformanceChart()}
          </CardContent>
        </Card>

        {/* Replace the old filter/sort controls and grid/list view with a message */}
        {!loading && filteredCourses.length > 0 && performanceData.length === 0 && (
          <Card>
            <CardContent className="p-6">
              <div className="flex flex-col items-center justify-center text-center">
                <AlertTriangle className="h-12 w-12 text-yellow-500 mb-4" />
                <h3 className="text-xl font-semibold">No quiz performance data available</h3>
                <p className="text-muted-foreground mt-2 max-w-lg">
                  Your courses are available, but there isn't any quiz performance data yet. 
                  Complete quizzes in your courses to see performance analytics.
                </p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}