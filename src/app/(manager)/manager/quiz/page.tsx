'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import { List, LayoutGrid, Search, BookOpen } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Course } from '@/types/quiz';

export default function CoursesPage() {
  const router = useRouter();
  const [courses, setCourses] = useState<Course[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('grid');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchCourses();
  }, []);

  const fetchCourses = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/staff/courses');
      if (!response.ok) throw new Error('Failed to fetch courses');
      const data = await response.json();
      setCourses(data);
    } catch (error) {
      console.error('Error:', error);
      toast.error('Failed to fetch courses');
    } finally {
      setIsLoading(false);
    }
  };

  const filteredCourses = courses.filter(course =>
    course.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    course.code.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleCourseClick = (courseId: string) => {
    router.push(`/manager/quiz/${courseId}`);
  };

  const renderGrid = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {isLoading ? (
        Array(6).fill(0).map((_, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="h-32 rounded-lg animate-pulse bg-slate-100 dark:bg-slate-800"
          />
        ))
      ) : filteredCourses.length === 0 ? (
        <div className="col-span-full text-center py-12">
          <p className="text-xl text-gray-500 dark:text-gray-400">No courses found</p>
        </div>
      ) : (
        <AnimatePresence>
          {filteredCourses.map((course) => (
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
                  <h3 className="text-lg font-medium dark:text-white">{course.code}</h3>
                  <p className="text-base text-gray-600 dark:text-gray-400 mt-1">{course.name}</p>
                  <div className="flex gap-2 mt-3">
                    <span className="text-sm text-gray-500 dark:text-gray-500">
                      {course.class.department}
                    </span>
                    <span className="text-sm text-gray-400 dark:text-gray-600">•</span>
                    <span className="text-sm text-gray-500 dark:text-gray-500">
                      {course.class.name}
                    </span>
                  </div>
                </div>
                <div className="text-indigo-600 dark:text-indigo-400 text-sm font-medium px-3 py-1 rounded-full border border-indigo-200 dark:border-indigo-900/50">
                  {course._count?.quizzes || 0} {course._count?.quizzes === 1 ? 'Quiz' : 'Quizzes'}
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      )}
    </div>
  );

  const renderTable = () => (
    <div className="rounded-lg border dark:border-slate-700/50">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="text-base py-4">Course Code</TableHead>
            <TableHead className="text-base py-4">Course Name</TableHead>
            <TableHead className="text-base py-4">Department</TableHead>
            <TableHead className="text-base py-4">Class</TableHead>
            <TableHead className="text-base py-4 text-right">Quizzes</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading ? (
            Array(5).fill(0).map((_, i) => (
              <TableRow key={i}>
                {Array(5).fill(0).map((_, j) => (
                  <TableCell key={j} className="py-4">
                    <div className="h-4 bg-slate-100 dark:bg-slate-800 rounded animate-pulse" />
                  </TableCell>
                ))}
              </TableRow>
            ))
          ) : filteredCourses.length === 0 ? (
            <TableRow>
              <TableCell colSpan={5} className="text-center py-8">
                <p className="text-gray-500 dark:text-gray-400">No courses found</p>
              </TableCell>
            </TableRow>
          ) : (
            filteredCourses.map((course) => (
              <TableRow
                key={course.id}
                onClick={() => handleCourseClick(course.id)}
                className="cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50"
              >
                <TableCell className="font-medium">{course.code}</TableCell>
                <TableCell>{course.name}</TableCell>
                <TableCell>{course.class.department}</TableCell>
                <TableCell>{course.class.name}</TableCell>
                <TableCell className="text-right">
                  <span className="text-indigo-600 dark:text-indigo-400 text-sm font-medium px-3 py-1 rounded-full border border-indigo-200 dark:border-indigo-900/50">
                    {course._count?.quizzes || 0}
                  </span>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );

  return (
    <div className="min-h-screen p-8">
      <div className="max-w-[90rem] mx-auto">
        <header className="flex justify-between items-center mb-8">
          <div className="flex items-center gap-2">
            <BookOpen className="h-8 w-8 text-indigo-600" />
            <h1 className="text-4xl font-bold">Courses</h1>
          </div>
          <Tabs value={viewMode} onValueChange={(value) => setViewMode(value as 'table' | 'grid')}>
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

        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="Search courses..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>

        <div className="rounded-lg p-6">
          {viewMode === 'grid' ? renderGrid() : renderTable()}
        </div>
      </div>
    </div>
  );
}
