"use client";

import { Suspense, useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { 
  BookOpen, 
  Calendar, 
  Clock, 
  User, 
  GraduationCap, 
  ArrowLeft, 
  AlertCircle, 
  CheckCircle, 
  XCircle, 
  RefreshCw,
  Users,
  FileDown,
  BarChart3,
  ChevronUp,
  ChevronDown
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  DropdownMenu, 
  DropdownMenuTrigger, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuSeparator 
} from "@/components/ui/dropdown-menu";
import * as XLSX from 'xlsx';
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
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
    user?: {
      name: string;
      email: string;
    };
  };
}

interface Quiz {
  id: string;
  title: string;
  description: string;
  startTime: string;
  endTime: string;
  duration: string;
  status: 'live' | 'upcoming' | 'completed' | 'missed';
  score?: number;
  totalScore?: number;
  staff: {
    name: string;
    id: string;
  };
  showResult: boolean;
}

const COLORS = ['#00C49F', '#FFBB28', '#FF8042', '#FF0000'];

// Enhanced theme-aware chart colors
const chartTheme = {
  dark: {
    background: '#1a1a1a',
    text: '#ffffff',
    grid: '#333333',
    tooltipBg: '#1a1a1a',
    tooltipBorder: '#444444',
    pieLabelColor: '#ffffff'
  },
  light: {
    background: '#ffffff',
    text: '#000000',
    grid: '#e5e5e5',
    tooltipBg: '#ffffff',
    tooltipBorder: '#e5e5e5',
    pieLabelColor: '#000000'
  }
};

export default function CourseDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const courseId = params.courseid as string;
  
  const [course, setCourse] = useState<Course | null>(null);
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [loading, setLoading] = useState({
    course: true,
    quizzes: true
  });
  const [activeTab, setActiveTab] = useState('all');
  const [error, setError] = useState<string | null>(null);
  const [showAnalytics, setShowAnalytics] = useState(true);
  const { theme } = useTheme();
  const [isDarkMode, setIsDarkMode] = useState(false);

  useEffect(() => {
    if (courseId) {
      fetchCourseDetails();
      fetchCourseQuizzes();
    }
  }, [courseId]);

  useEffect(() => {
    setIsDarkMode(theme === "dark");
  }, [theme]);

  const fetchCourseDetails = async () => {
    try {
      setLoading(prev => ({ ...prev, course: true }));
      const response = await fetch(`/api/student/courses/${courseId}`);
      
      if (!response.ok) {
        throw new Error("Failed to fetch course details");
      }

      const data = await response.json();
      setCourse(data);
    } catch (error) {
      console.error("Error fetching course details:", error);
      toast.error("Failed to load course details. Please try again later.");
      setError("Failed to load course details");
    } finally {
      setLoading(prev => ({ ...prev, course: false }));
    }
  };

  const fetchCourseQuizzes = async () => {
    try {
      setLoading(prev => ({ ...prev, quizzes: true }));
      const response = await fetch(`/api/student/courses/${courseId}/quizzes`);
      
      if (!response.ok) {
        throw new Error("Failed to fetch quizzes");
      }

      const data = await response.json();
      setQuizzes(data);
    } catch (error) {
      console.error("Error fetching quizzes:", error);
      toast.error("Failed to load quizzes for this course. Please try again later.");
    } finally {
      setLoading(prev => ({ ...prev, quizzes: false }));
    }
  };

  const filteredQuizzes = () => {
    if (activeTab === 'all') {
      return quizzes;
    }
    return quizzes.filter(quiz => quiz.status === activeTab);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'live':
        return <Badge variant="default" className="bg-green-500"><AlertCircle className="mr-1 h-3 w-3" /> Live</Badge>;
      case 'upcoming':
        return <Badge variant="secondary"><Clock className="mr-1 h-3 w-3" /> Upcoming</Badge>;
      case 'completed':
        return <Badge variant="outline"><CheckCircle className="mr-1 h-3 w-3" /> Completed</Badge>;
      case 'missed':
        return <Badge variant="destructive"><XCircle className="mr-1 h-3 w-3" /> Missed</Badge>;
      default:
        return null;
    }
  };

  // New function to download quizzes as Excel
  const downloadQuizzesReport = () => {
    try {
      // Filter completed quizzes with scores and include missed quizzes as 0
      const relevantQuizzes = quizzes.filter(quiz => 
        quiz.status === 'completed' || quiz.status === 'missed'
      );

      if (relevantQuizzes.length === 0) {
        toast.info("No completed or missed quizzes available to download");
        return;
      }

      // Format the data for Excel
      const reportData = relevantQuizzes.map(quiz => ({
        "Quiz Title": quiz.title,
        "Quiz Date": new Date(quiz.startTime).toLocaleDateString(),
        "Score": quiz.status === 'missed' ? 0 : (quiz.score || 0),
        "Total Score": quiz.totalScore || 100,
        "Percentage": quiz.status === 'missed' ? 
          "0%" : 
          ((quiz.score || 0) / (quiz.totalScore || 1) * 100).toFixed(2) + '%',
        "Status": quiz.status.charAt(0).toUpperCase() + quiz.status.slice(1),
        "Instructor": quiz.staff.name
      }));

      // Create worksheet
      const worksheet = XLSX.utils.json_to_sheet(reportData);
      
      // Create column widths
      const colWidths = [
        { wch: 30 }, // Quiz Title
        { wch: 15 }, // Quiz Date
        { wch: 10 }, // Score
        { wch: 10 }, // Total Score
        { wch: 12 }, // Percentage
        { wch: 15 }, // Status
        { wch: 20 }, // Instructor
      ];
      
      worksheet['!cols'] = colWidths;

      // Create workbook
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Quiz Results");
      
      // Course name for the file
      const courseName = course?.name?.replace(/\s+/g, '_') || 'Course';
      
      // Generate Excel file and download
      XLSX.writeFile(workbook, `${courseName}_Quiz_Results.xlsx`);
      
      toast.success("Quiz report downloaded successfully");
    } catch (error) {
      console.error("Error downloading quiz report:", error);
      toast.error("Failed to download quiz report");
    }
  };

  // Calculate performance statistics including missed quizzes as 0
  const calculatePerformanceStats = () => {
    // Only include completed quizzes with showResult true and missed quizzes
    const completedOrMissedQuizzes = quizzes.filter(q => 
      (q.status === 'completed' && q.showResult) || q.status === 'missed'
    );
    
    if (completedOrMissedQuizzes.length === 0) return null;

    // Calculate scores with normalization
    const quizScores = completedOrMissedQuizzes.map(quiz => ({
      ...quiz,
      normalizedScore: quiz.status === 'missed' ? 0 : ((quiz.score || 0) / (quiz.totalScore || 100)) * 100
    }));

    const totalScore = completedOrMissedQuizzes.reduce((sum, quiz) => 
      sum + (quiz.status === 'completed' ? (quiz.score || 0) : 0), 0
    );

    const totalPossibleScore = completedOrMissedQuizzes.reduce((sum, quiz) => 
      sum + (quiz.totalScore || 100), 0
    );

    // Calculate average percentage using normalized scores
    const averagePercentage = quizScores.reduce((sum, quiz) => 
      sum + quiz.normalizedScore, 0) / quizScores.length;

    const scoreDistribution = {
      excellent: quizScores.filter(q => q.normalizedScore >= 85).length,
      good: quizScores.filter(q => q.normalizedScore >= 70 && q.normalizedScore < 85).length,
      average: quizScores.filter(q => q.normalizedScore >= 50 && q.normalizedScore < 70).length,
      poor: quizScores.filter(q => q.normalizedScore < 50).length,
    };

    const scoreByQuiz = quizScores.map((quiz, index) => ({
      name: `Quiz ${index + 1}`,
      title: quiz.title,
      score: quiz.normalizedScore,
      status: quiz.status
    }));

    return {
      totalScore,
      totalPossibleScore,
      averagePercentage,
      scoreDistribution,
      scoreByQuiz
    };
  };

  const performanceStats = calculatePerformanceStats();

  if (error) {
    return (
      <div className="container mx-auto py-8">
        <Button variant="ghost" onClick={() => router.back()} className="mb-6">
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to Courses
        </Button>
        
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mb-4" />
          <h3 className="text-xl font-semibold">{error}</h3>
          <Button onClick={fetchCourseDetails} variant="outline" className="mt-4">
            <RefreshCw className="mr-2 h-4 w-4" /> Retry
          </Button>
        </div>
      </div>
    );
  }

  if (loading.course) {
    return (
      <div className="container mx-auto py-8">
        <Button variant="ghost" disabled className="mb-6">
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to Courses
        </Button>
        
        <div className="space-y-4">
          <Skeleton className="h-10 w-2/3" />
          <Skeleton className="h-6 w-1/2" />
          <div className="grid gap-6 grid-cols-1 md:grid-cols-3 mt-8">
            <Skeleton className="h-32" />
            <Skeleton className="h-32" />
            <Skeleton className="h-32" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8">
      <Button variant="ghost" onClick={() => router.push("/student/course")} className="mb-6">
        <ArrowLeft className="mr-2 h-4 w-4" /> Back to Courses
      </Button>
      
      <div className="space-y-6">
        {/* Course Header */}
        <div className="flex justify-between items-start">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-3xl font-bold">{course?.name}</h1>
              {course?.code && (
                <Badge variant="outline" className="ml-2 text-base">{course.code}</Badge>
              )}
            </div>
            <p className="mt-2 text-muted-foreground">{course?.description || "No course description available"}</p>
          </div>
          
          {/* Download Report Button */}
          <div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="flex items-center gap-2">
                  <FileDown className="h-4 w-4" />
                  <span>Export</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuItem onClick={downloadQuizzesReport} className="cursor-pointer">
                  <FileDown className="mr-2 h-4 w-4" />
                  <span>Download Quiz Report</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <div className="p-2 text-xs text-muted-foreground">
                  Export your quiz results as Excel
                </div>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Course Information Cards */}
        <div className="grid gap-6 grid-cols-1 md:grid-cols-3">
          {/* Course Details */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Course Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {course?.semester && (
                <div className="flex items-center">
                  <BookOpen className="h-4 w-4 mr-3 text-muted-foreground" />
                  <div>
                    <span className="text-sm text-muted-foreground">Semester</span>
                    <p className="font-medium">{course.semester}</p>
                  </div>
                </div>
              )}
              
              <div className="flex items-center">
                <Users className="h-4 w-4 mr-3 text-muted-foreground" />
                <div>
                  <span className="text-sm text-muted-foreground">Class</span>
                  <p className="font-medium">{course?.class?.name}</p>
                </div>
              </div>
              
              {course?.staff && (
                <div className="flex items-center">
                  <GraduationCap className="h-4 w-4 mr-3 text-muted-foreground" />
                  <div>
                    <span className="text-sm text-muted-foreground">Instructor</span>
                    <p className="font-medium">{course.staff.user?.name || course.staff.name}</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
          
          {/* Quiz Statistics */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Quiz Statistics</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <span>Total Quizzes</span>
                <Badge variant="outline">{quizzes.length}</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span>Completed</span>
                <Badge variant="outline">{quizzes.filter(q => q.status === "completed").length}</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span>Upcoming</span>
                <Badge variant="outline">{quizzes.filter(q => q.status === "upcoming").length}</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span>Live</span>
                <Badge variant="outline" className="bg-green-500 text-white">{quizzes.filter(q => q.status === "live").length}</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span>Missed</span>
                <Badge variant="destructive">{quizzes.filter(q => q.status === "missed").length}</Badge>
              </div>
            </CardContent>
          </Card>
          
          {/* Performance Overview */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Performance Overview</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {loading.quizzes ? (
                <div className="space-y-2">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-4 w-full" />
                </div>
              ) : (
                <>
                  {performanceStats ? (
                    <>
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm text-muted-foreground">Normalized Average Score</span>
                          <span className="font-medium">
                            {performanceStats.averagePercentage.toFixed(1)}%
                          </span>
                        </div>
                        <Progress 
                          value={performanceStats.averagePercentage} 
                          className="h-2" 
                        />
                      </div>
                      <div className="pt-2">
                        <span className="text-sm text-muted-foreground">Total Score</span>
                        <p className="font-medium">
                          {performanceStats.totalScore.toFixed(1)} / {performanceStats.totalPossibleScore.toFixed(1)} points
                        </p>
                      </div>
                    </>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-4 text-center text-muted-foreground">
                      <p>No completed quizzes yet</p>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Performance Analytics Section */}
        {performanceStats && (
          <Card>
            <CardHeader className="pb-2">
              <div className="flex justify-between items-center">
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Performance Analytics
                </CardTitle>
                <Button 
                  variant="ghost" 
                  size="sm"
                  className="h-8 w-8 p-0" 
                  onClick={() => setShowAnalytics(!showAnalytics)}
                >
                  {showAnalytics ? (
                    <ChevronUp className="h-4 w-4" />
                  ) : (
                    <ChevronDown className="h-4 w-4" />
                  )}
                </Button>
              </div>
              <CardDescription>
                Detailed breakdown of your quiz performance
              </CardDescription>
            </CardHeader>
            
            {showAnalytics && (
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  {/* Score Distribution Pie Chart */}
                  <div className="flex flex-col">
                    <h3 className="text-sm font-medium mb-4 text-center">Score Distribution</h3>
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={[
                              { name: 'Excellent (≥85%)', value: performanceStats.scoreDistribution.excellent },
                              { name: 'Good (70-84%)', value: performanceStats.scoreDistribution.good },
                              { name: 'Average (50-69%)', value: performanceStats.scoreDistribution.average },
                              { name: 'Poor (<50%)', value: performanceStats.scoreDistribution.poor }
                            ]}
                            cx="50%"
                            cy="50%"
                            labelLine={false}
                            label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                            outerRadius={70}
                            fill="#8884d8"
                            dataKey="value"
                            labelStyle={{ fill: isDarkMode ? chartTheme.dark.pieLabelColor : chartTheme.light.pieLabelColor }}
                          >
                            {[0, 1, 2, 3].map((entry, index) => (
                              <Cell 
                                key={`cell-${index}`} 
                                fill={COLORS[index % COLORS.length]} 
                                stroke={isDarkMode ? chartTheme.dark.background : chartTheme.light.background}
                              />
                            ))}
                          </Pie>
                          <Tooltip 
                            formatter={(value) => [`${value} Quiz(es)`, 'Count']}
                            contentStyle={{
                              backgroundColor: isDarkMode ? chartTheme.dark.tooltipBg : chartTheme.light.tooltipBg,
                              border: `1px solid ${isDarkMode ? chartTheme.dark.tooltipBorder : chartTheme.light.tooltipBorder}`,
                              borderRadius: '6px',
                              color: isDarkMode ? chartTheme.dark.text : chartTheme.light.text,
                              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)'
                            }}
                            itemStyle={{
                              color: isDarkMode ? chartTheme.dark.text : chartTheme.light.text
                            }}
                            labelStyle={{
                              color: isDarkMode ? chartTheme.dark.text : chartTheme.light.text
                            }}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                  
                  {/* Score by Quiz Bar Chart */}
                  <div className="flex flex-col">
                    <h3 className="text-sm font-medium mb-4 text-center">Quiz Performance Timeline</h3>
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          data={performanceStats.scoreByQuiz}
                          margin={{ top: 5, right: 30, left: 0, bottom: 5 }}
                        >
                          <CartesianGrid 
                            strokeDasharray="3 3" 
                            stroke={isDarkMode ? chartTheme.dark.grid : chartTheme.light.grid}
                            // Fix for white dotted border
                            strokeOpacity={isDarkMode ? 0.5 : 1}
                          />
                          <XAxis 
                            dataKey="name" 
                            stroke={isDarkMode ? chartTheme.dark.text : chartTheme.light.text}
                            tick={{ fill: isDarkMode ? chartTheme.dark.text : chartTheme.light.text }}
                          />
                          <YAxis 
                            domain={[0, 100]} 
                            tickFormatter={(value) => `${value}%`}
                            stroke={isDarkMode ? chartTheme.dark.text : chartTheme.light.text}
                            tick={{ fill: isDarkMode ? chartTheme.dark.text : chartTheme.light.text }}
                          />
                          <Tooltip 
                            formatter={(value, name, props) => [`${value.toFixed(1)}%`, props.payload.title]}
                            labelFormatter={(value) => `${value}`}
                            contentStyle={{
                              backgroundColor: isDarkMode ? chartTheme.dark.tooltipBg : chartTheme.light.tooltipBg,
                              border: `1px solid ${isDarkMode ? chartTheme.dark.tooltipBorder : chartTheme.light.tooltipBorder}`,
                              borderRadius: '6px',
                              color: isDarkMode ? chartTheme.dark.text : chartTheme.light.text,
                              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)'
                            }}
                            itemStyle={{
                              color: isDarkMode ? chartTheme.dark.text : chartTheme.light.text
                            }}
                            labelStyle={{
                              color: isDarkMode ? chartTheme.dark.text : chartTheme.light.text
                            }}
                          />
                          <Bar 
                            dataKey="score" 
                            name="Score" 
                            fill="#8884d8"
                            isAnimationActive={true}
                            // Remove any default stroke borders
                            stroke="none"
                          >
                            {performanceStats.scoreByQuiz.map((entry, index) => (
                              <Cell 
                                key={`cell-${index}`} 
                                fill={entry.status === 'missed' ? '#FF0000' : (entry.score >= 85 ? '#00C49F' : (entry.score >= 70 ? '#FFBB28' : (entry.score >= 50 ? '#FF8042' : '#FF0000')))}
                                // Remove stroke for better dark mode display
                                stroke="none"
                              />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </div>
              </CardContent>
            )}
          </Card>
        )}

        {/* Quizzes List */}
        <div className="mt-8">
          <h2 className="text-2xl font-semibold mb-4">Quizzes</h2>
          
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid grid-cols-5 mb-6">
              <TabsTrigger value="all">All</TabsTrigger>
              <TabsTrigger value="live">Live</TabsTrigger>
              <TabsTrigger value="upcoming">Upcoming</TabsTrigger>
              <TabsTrigger value="completed">Completed</TabsTrigger>
              <TabsTrigger value="missed">Missed</TabsTrigger>
            </TabsList>
            
            <TabsContent value={activeTab} className="space-y-4">
              {loading.quizzes ? (
                Array(3).fill(0).map((_, i) => (
                  <Card key={i} className="w-full">
                    <CardHeader>
                      <Skeleton className="h-6 w-[250px]" />
                      <Skeleton className="h-4 w-[200px]" />
                    </CardHeader>
                    <CardContent>
                      <Skeleton className="h-4 w-full mb-2" />
                      <Skeleton className="h-4 w-full mb-2" />
                      <Skeleton className="h-4 w-full" />
                    </CardContent>
                  </Card>
                ))
              ) : filteredQuizzes().length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <BookOpen className="h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-xl font-semibold">No {activeTab !== 'all' ? activeTab : ''} quizzes found</h3>
                </div>
              ) : (
                filteredQuizzes().map((quiz) => (
                  <Card
                    key={quiz.id}
                    className="w-full hover:shadow-md transition-shadow duration-200 cursor-pointer"
                    onClick={() => {
                      if (quiz.status === 'live') {
                        router.push(`/quiz/${quiz.id}`);
                      } else if (quiz.status === 'completed' && quiz.showResult) {
                        router.push(`/student/quiz/result/${quiz.id}`);
                      } else if (quiz.status === 'completed' || quiz.status === 'missed') {
                        toast.info("Results are not available for this quiz yet.");
                      } else {
                        toast.info("This quiz is not available for taking yet.");
                      }
                    }}
                  >
                    <CardHeader className="pb-2">
                      <div className="flex justify-between items-center">
                        <CardTitle className="text-lg">{quiz.title}</CardTitle>
                        {getStatusBadge(quiz.status)}
                      </div>
                      <CardDescription>{quiz.description}</CardDescription>
                    </CardHeader>
                    
                    <CardContent>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <div className="flex items-center">
                            <Calendar className="mr-2 h-4 w-4 text-muted-foreground" />
                            <span className="text-sm font-medium">Start:</span>
                            <span className="ml-2 text-sm">{new Date(quiz.startTime).toLocaleString()}</span>
                          </div>
                          <div className="flex items-center">
                            <Calendar className="mr-2 h-4 w-4 text-muted-foreground" />
                            <span className="text-sm font-medium">End:</span>
                            <span className="ml-2 text-sm">{new Date(quiz.endTime).toLocaleString()}</span>
                          </div>
                        </div>
                        
                        <div className="space-y-2">
                          <div className="flex items-center">
                            <Clock className="mr-2 h-4 w-4 text-muted-foreground" />
                            <span className="text-sm font-medium">Duration:</span>
                            <span className="ml-2 text-sm">{quiz.duration}</span>
                          </div>
                          
                          {quiz.status === 'completed' ? (
                            quiz.showResult ? (
                              <div className="flex items-center">
                                <div className="flex-1">
                                  <div className="flex justify-between mb-1">
                                    <span className="text-sm font-medium">Score:</span>
                                    <span className="text-sm">
                                      {quiz.score} / {quiz.totalScore}
                                      <span className="ml-2 text-xs text-muted-foreground">
                                        ({((quiz.score || 0) / (quiz.totalScore || 1) * 100).toFixed(1)}%)
                                      </span>
                                    </span>
                                  </div>
                                  <Progress
                                    value={(quiz.score || 0) / (quiz.totalScore || 1) * 100}
                                    className="h-1.5"
                                  />
                                </div>
                              </div>
                            ) : (
                              <div className="flex items-center">
                                <div className="flex-1">
                                  <div className="flex justify-between mb-1 text-muted-foreground">
                                    <span className="text-sm">Results will be available soon</span>
                                  </div>
                                  <div className="h-1.5 w-full bg-gray-200 dark:bg-gray-700 rounded-full"></div>
                                </div>
                              </div>
                            )
                          ) : quiz.status === 'missed' ? (
                            <div className="flex items-center">
                              <div className="flex-1">
                                <div className="flex justify-between mb-1">
                                  <span className="text-sm font-medium">Score:</span>
                                  <span className="text-sm">0 / {quiz.totalScore || 100}</span>
                                </div>
                                <div className="h-1.5 w-full bg-gray-200 dark:bg-gray-700 rounded-full"></div>
                              </div>
                            </div>
                          ) : null}
                        </div>
                      </div>
                    </CardContent>
                    
                    <Separator />
                    
                    <CardFooter className="pt-4">
                      {quiz.status === 'live' ? (
                        <Button className="w-full bg-green-500 hover:bg-green-600">
                          Start Quiz
                        </Button>
                      ) : quiz.status === 'completed' ? (
                        quiz.showResult ? (
                          <Button className="w-full" onClick={() => router.push(`/student/quiz/result/${quiz.id}`)}>
                            <CheckCircle className="mr-2 h-4 w-4" /> View Results
                          </Button>
                        ) : (
                          <Button className="w-full" variant="outline" disabled>
                            Results Pending
                          </Button>
                        )
                      ) : quiz.status === 'missed' ? (
                        <Button className="w-full" variant="outline" disabled>
                          Missed Quiz
                        </Button>
                      ) : (
                        <Button className="w-full" variant="outline" disabled>
                          Not Available Yet
                        </Button>
                      )}
                    </CardFooter>
                  </Card>
                ))
              )}
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}