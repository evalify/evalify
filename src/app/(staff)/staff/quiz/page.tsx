'use client';

import React, { useEffect, useState } from 'react';
import { Pencil, SquareChartGantt, Trash2, FileBadge2, Clock, PlayCircle, CheckCircle2, PlusCircle, LayoutGrid, List, Search, SlidersHorizontal, Calendar, TimerReset, MoreHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';

type Course = {
    id: string;
    name: string;
    code: string;
    classId: string;
    staffId: string;
    semesterId: string | null;
    isactive: boolean;
    class: {
        name: string;
    };
};

type Quiz = {
    id: string;
    title: string;
    description: string;
    startTime: Date;
    endTime: Date;
    duration: number;
    createdbyId: string;
    settingsId: string;
    settings: {
        fullscreen: boolean;
        calculator: boolean;
        shuffle: boolean;
        showResult: boolean;
    };
    courses: Course[];
};

const getQuizStatus = (startTime: Date, endTime: Date): { icon: React.ReactNode; color: string; text: string } => {
    const now = new Date();
    if (now < new Date(startTime)) {
        return {
            icon: <Clock className="h-4 w-4" />,
            color: 'text-blue-500',
            text: 'Upcoming'
        };
    } else if (now > new Date(endTime)) {
        return {
            icon: <CheckCircle2 className="h-4 w-4" />,
            color: 'text-gray-500',
            text: 'Completed'
        };
    } else {
        return {
            icon: <PlayCircle className="h-4 w-4" />,
            color: 'text-green-500',
            text: 'Active'
        };
    }
};


const isValidDate = (date: any): boolean => {
    if (!date) return false;
    const timestamp = Date.parse(date);
    return !isNaN(timestamp) && timestamp > 0;
};

const createSafeDate = (date: any): Date => {
    if (!date) return new Date();
    if (date instanceof Date && isValidDate(date)) return date;

    const timestamp = Date.parse(date);
    if (!isNaN(timestamp) && timestamp > 0) {
        return new Date(timestamp);
    }
    return new Date();
};

const SafeDateTimeInput = ({ value, onChange, label }: { 
    value: Date, 
    onChange: (date: Date) => void,
    label: string 
}) => {
    const date = value.toISOString().split('T')[0];
    const time = value.toTimeString().slice(0, 5);

    const handleDateChange = (newDate: string) => {
        const [year, month, day] = newDate.split('-').map(Number);
        const newDateTime = new Date(value);
        newDateTime.setFullYear(year, month - 1, day);
        onChange(newDateTime);
    };

    const handleTimeChange = (newTime: string) => {
        const [hours, minutes] = newTime.split(':').map(Number);
        const newDateTime = new Date(value);
        newDateTime.setHours(hours, minutes);
        onChange(newDateTime);
    };

    return (
        <div className="space-y-2">
            <Label>{label}</Label>
            <div className="flex gap-2">
                <Input
                    type="date"
                    value={date}
                    onChange={(e) => handleDateChange(e.target.value)}
                    className="flex-1"
                />
                <Input
                    type="time"
                    value={time}
                    onChange={(e) => handleTimeChange(e.target.value)}
                    className="w-32"
                />
            </div>
        </div>
    );
};

const QuizCard = ({ quiz, onEdit, onDelete, router }: {
    quiz: Quiz;
    onEdit: (quiz: Quiz) => void;
    onDelete: (id: string) => void;
    router: any;
}) => {
    const { icon, color, text } = getQuizStatus(quiz.startTime, quiz.endTime);

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="bg-white dark:bg-slate-800/50 rounded-xl shadow-xl p-6 hover:shadow-2xl transition-all duration-300 border border-gray-100 dark:border-slate-700/50 w-full backdrop-blur-sm"
        >
            <div className="flex justify-between items-start mb-4">
                <div>
                    <h2 className="text-2xl font-semibold text-gray-800 dark:text-slate-100">{quiz.title}</h2>
                    <p className="text-gray-600 dark:text-slate-300 mt-1">{quiz.description}</p>
                </div>
                <div className="flex items-center gap-2">
                    <div className={`flex items-center gap-2 px-3 py-1 rounded-full ${color} bg-opacity-10`}>
                        {icon}
                        <span className="text-sm font-medium">{text}</span>
                    </div>
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                                <MoreHorizontal className="h-4 w-4" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => onEdit(quiz)}>
                                <Pencil className="h-4 w-4 mr-2" /> Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => onDelete(quiz.id)} className="text-red-600">
                                <Trash2 className="h-4 w-4 mr-2" /> Delete
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </div>

            <div className="grid grid-cols-3 gap-4 my-4">
                <div className="flex items-center text-gray-700 dark:text-gray-300">
                    <Calendar className="h-5 w-5 mr-2" />
                    <span className="text-sm">{quiz.startTime.toLocaleDateString()}</span>
                </div>
                <div className="flex items-center text-gray-700 dark:text-gray-300">
                    <Clock className="h-5 w-5 mr-2" />
                    <span className="text-sm">
                        {quiz.startTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                </div>
                <div className="flex items-center text-gray-700 dark:text-gray-300">
                    <TimerReset className="h-5 w-5 mr-2" />
                    <span className="text-sm">{quiz.duration} minutes</span>
                </div>
            </div>

            <div className="flex justify-between items-center mt-4">
                <div className="flex flex-wrap gap-2">
                    {quiz.courses.map((course) => (
                        <span
                            key={course.id}
                            className="bg-indigo-100 dark:bg-indigo-900/50 text-indigo-800 dark:text-indigo-200 text-xs font-medium px-2.5 py-0.5 rounded-full"
                        >
                            {course.code}
                        </span>
                    ))}
                </div>
                <div className="flex gap-2">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => router.push(`/staff/quiz/${quiz.id}`)}
                        className="dark:bg-slate-700/50 dark:hover:bg-slate-600/50"
                    >
                        <SquareChartGantt className="h-4 w-4 mr-2" />
                        Manage Questions
                    </Button>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => router.push(`/staff/quiz/result/${quiz.id}`)}
                        className="dark:bg-slate-700/50 dark:hover:bg-slate-600/50"
                    >
                        <FileBadge2 className="h-4 w-4 mr-2" />
                        View Results
                    </Button>
                </div>
            </div>
        </motion.div>
    );
};

const validateDateTime = (startTime: Date, endTime: Date, duration: number): string | null => {
    const now = new Date();
    const startDate = new Date(startTime);
    const endDate = new Date(endTime);

    // Reset seconds and milliseconds for more accurate comparison
    now.setSeconds(0, 0);
    startDate.setSeconds(0, 0);
    endDate.setSeconds(0, 0);

    // Allow start time to be within the current minute
    if (startDate < now) {
        const diffInMinutes = (now.getTime() - startDate.getTime()) / (1000 * 60);
        if (diffInMinutes > 1) {
            return "Start time cannot be in the past";
        }
    }

    if (endDate <= startDate) {
        return "End time must be after start time";
    }

    const durationInMs = duration * 60 * 1000;
    const timeDiff = endDate.getTime() - startDate.getTime();
    if (timeDiff < durationInMs) {
        return "Time window must be greater than quiz duration";
    }

    return null;
};

export default function QuizPage() {
    const router = useRouter();
    const [quizzes, setQuizzes] = useState<Quiz[]>([]);
    const [open, setOpen] = useState(false);
    const [editMode, setEditMode] = useState(false);
    const [formData, setFormData] = useState<Partial<Quiz>>({
        title: '',
        description: '',
        startTime: createSafeDate(new Date()),
        endTime: createSafeDate(new Date(Date.now() + 24 * 60 * 60 * 1000)),
        duration: 45,
        settings: {
            fullscreen: false,
            calculator: false,
            shuffle: false,
            showResult: false,
        },
        courseIds: [],
    });
    const [courses, setCourses] = useState<Course[]>([]);
    const [viewMode, setViewMode] = useState<'table' | 'grid'>('grid');
    const [searchQuery, setSearchQuery] = useState('');
    const [sortBy, setSortBy] = useState<'date' | 'title' | 'status'>('date');
    const [filterStatus, setFilterStatus] = useState<'all' | 'upcoming' | 'active' | 'completed'>('all');

    useEffect(() => {
        fetchQuizzes();
        fetchCourses();
    }, []);

    const fetchQuizzes = async () => {
        try {
            const response = await fetch('/api/staff/quiz', {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                },
                credentials: 'include',
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to fetch quizzes');
            }

            const data = await response.json();

            setQuizzes(data
                .map((quiz: Quiz) => ({
                    ...quiz,
                    startTime: createSafeDate(quiz.startTime),
                    endTime: createSafeDate(quiz.endTime)
                }))
                .sort((a: Quiz, b: Quiz) => b.startTime.getTime() - a.startTime.getTime())
            );
        } catch (error) {
            console.log('Error fetching quizzes:', error);
            toast.error(error instanceof Error ? error.message : 'Failed to fetch quizzes');
            setQuizzes([]);
        }
    };

    const fetchCourses = async () => {
        try {
            const response = await fetch('/api/staff/courses', {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                },
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Failed to fetch courses');
            }

            const responseData = await response.text();
            if (responseData.startsWith('<')) {
                throw new Error('Unexpected response format');
            }

            const data = responseData ? JSON.parse(responseData) : [];
            setCourses(Array.isArray(data) ? data : []);
        } catch (error) {
            console.log('Error fetching courses:', error);
            toast.error(error instanceof Error ? error.message : 'Failed to fetch courses');
            setCourses([]);
        }
    };

    const resetForm = () => {
        const now = new Date();
        // Round to nearest future minute
        now.setSeconds(0, 0);
        now.setMinutes(now.getMinutes() + 1);

        const endTime = new Date(now.getTime() + 45 * 60000); // 45 minutes from rounded now

        setFormData({
            title: '',
            description: '',
            startTime: now,
            endTime: endTime,
            duration: 45,
            settings: {
                fullscreen: false,
                calculator: false,
                shuffle: false,
                showResult: false,
            },
            courseIds: [],
        });
        setEditMode(false);
    };

    const handleEdit = (quiz: Quiz) => {
        setEditMode(true);
        setFormData({
            id: quiz.id, // Add this line to include quiz ID
            title: quiz.title,
            description: quiz.description,
            startTime: createSafeDate(quiz.startTime),
            endTime: createSafeDate(quiz.endTime),
            duration: quiz.duration,
            settings: {
                ...quiz.settings,
                id: quiz.settingsId // Add this line to include settings ID
            },
            courseIds: quiz.courses.map(course => course.id),
        });
        setOpen(true);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        try {
            const startTime = createSafeDate(formData.startTime);
            const endTime = createSafeDate(formData.endTime);

            // Round dates to nearest minute for consistent comparison
            startTime.setSeconds(0, 0);
            endTime.setSeconds(0, 0);

            const validationError = validateDateTime(startTime, endTime, formData.duration || 0);
            if (validationError) {
                toast.error(validationError);
                return;
            }

            if (!formData.duration || formData.duration <= 0) {
                toast.error('Duration must be greater than 0');
                return;
            }

            const endpoint = '/api/staff/quiz';
            const method = editMode ? 'PUT' : 'POST';

            const requestData = {
                ...formData,
                startTime: startTime.toISOString(),
                endTime: endTime.toISOString(),
                settingsId: editMode ? formData.settings?.id : undefined,
                settings: {
                    ...formData.settings,
                },
                courseIds: formData.courseIds || []
            };

            const response = await fetch(endpoint, {
                method,
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify(requestData),
            });

            const contentType = response.headers.get('content-type');
            if (!contentType || !contentType.includes('application/json')) {
                throw new Error('Invalid response format from server');
            }

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.error || `Failed to ${editMode ? 'update' : 'create'} quiz`);
            }

            if (!result.success && editMode) {
                throw new Error(result.error || 'Failed to update quiz');
            }

            toast.success(`Quiz ${editMode ? 'updated' : 'created'} successfully`);
            setOpen(false);
            resetForm();
            fetchQuizzes();
        } catch (error) {
            console.log(`Error ${editMode ? 'updating' : 'creating'} quiz:`, error);
            toast.error(error instanceof Error ? error.message : `Failed to ${editMode ? 'update' : 'create'} quiz`);
        }
    };

    const handleDelete = async (id: string) => {
        try {
            const response = await fetch(`/api/staff/quiz?id=${id}`, {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json',
                },
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to delete quiz');
            }

            const result = await response.json();

            if (result.success) {
                toast.success(result.message || 'Quiz deleted successfully');
                fetchQuizzes();
            } else {
                throw new Error(result.error || 'Failed to delete quiz');
            }
        } catch (error) {
            console.log('Delete error:', error);
            toast.error(error instanceof Error ? error.message : 'Failed to delete quiz');
        }
    };

    const handleCourseChange = (courseId: string) => {
        setFormData((prevFormData) => {
            const newCourseIds = prevFormData.courseIds?.includes(courseId)
                ? prevFormData.courseIds.filter(id => id !== courseId)
                : [...(prevFormData.courseIds || []), courseId];
            return { ...prevFormData, courseIds: newCourseIds };
        });
    };

    const filteredAndSortedQuizzes = React.useMemo(() => {
        let filtered = quizzes.filter(quiz => {
            const matchesSearch = quiz.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                quiz.description.toLowerCase().includes(searchQuery.toLowerCase());

            const status = getQuizStatus(quiz.startTime, quiz.endTime).text.toLowerCase();
            const matchesFilter = filterStatus === 'all' || status === filterStatus;

            return matchesSearch && matchesFilter;
        });

        return filtered.sort((a, b) => {
            switch (sortBy) {
                case 'date':
                    return b.startTime.getTime() - a.startTime.getTime();
                case 'title':
                    return a.title.localeCompare(b.title);
                case 'status':
                    const statusA = getQuizStatus(a.startTime, a.endTime).text;
                    const statusB = getQuizStatus(b.startTime, b.endTime).text;
                    return statusA.localeCompare(statusB);
                default:
                    return 0;
            }
        });
    }, [quizzes, searchQuery, sortBy, filterStatus]);

    const settingsFields = ['fullscreen', 'calculator', 'shuffle', 'showResult'];

    return (
        <div className="min-h-screen bg-gradient-to-br p-8">
            <div className="max-w-7xl mx-auto">
                <header className="flex justify-between items-center mb-6">
                    <h1 className="text-4xl font-bold">Quiz</h1>
                    <div className="flex items-center gap-4">
                        <Tabs value={viewMode} onValueChange={(value) => setViewMode(value as 'table' | 'grid')}>
                            <TabsList className="bg-white dark:bg-gray-800">
                                <TabsTrigger value="table" className="data-[state=active]:bg-indigo-100 dark:data-[state=active]:bg-gray-700">
                                    <List className="h-4 w-4 mr-1" />
                                    Table
                                </TabsTrigger>
                                <TabsTrigger value="grid" className="data-[state=active]:bg-indigo-100 dark:data-[state=active]:bg-gray-700">
                                    <LayoutGrid className="h-4 w-4 mr-1" />
                                    Grid
                                </TabsTrigger>
                            </TabsList>
                        </Tabs>

                        <Dialog
                            open={open}
                            onOpenChange={(open) => {
                                setOpen(open);
                                if (!open) resetForm();
                            }}
                        >
                            <DialogTrigger asChild>
                                <Button className="bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600 text-white font-semibold py-2 px-4 rounded-full shadow-lg transition duration-300 ease-in-out transform hover:-translate-y-1 hover:scale-105">
                                    <PlusCircle className="mr-2 h-5 w-5" />
                                    Create Quiz
                                </Button>
                            </DialogTrigger>
                            <DialogContent className="sm:max-w-[800px] dark:border-gray-900 dark:bg-gray-950 max-h-[90vh] overflow-hidden flex flex-col">
                                <DialogHeader>
                                    <DialogTitle className="text-2xl font-bold text-indigo-900 dark:text-indigo-100">
                                        {editMode ? 'Edit Quiz' : 'Create New Quiz'}
                                    </DialogTitle>
                                    <DialogDescription className="dark:text-gray-300">
                                        Fill in the details below to {editMode ? 'update' : 'create'} a quiz. Click save when you're done.
                                    </DialogDescription>
                                </DialogHeader>
                                <div className="flex-1 overflow-y-auto px-6 py-2">
                                    <form onSubmit={handleSubmit} className="space-y-6">
                                        <div>
                                            <Label htmlFor="title" className="text-indigo-900 dark:text-indigo-100">Quiz Title</Label>
                                            <Input
                                                id="title"
                                                value={formData.title}
                                                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                                className="mt-1 dark:bg-gray-900 dark:border-gray-600 dark:text-white"
                                                placeholder="Enter quiz title"
                                            />
                                        </div>
                                        <div>
                                            <Label htmlFor="description" className="text-indigo-900 dark:text-indigo-100">Description</Label>
                                            <Input
                                                id="description"
                                                value={formData.description}
                                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                                className="mt-1 dark:bg-gray-900 dark:border-gray-600 dark:text-white"
                                                placeholder="Enter quiz description"
                                            />
                                        </div>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <SafeDateTimeInput
                                                value={formData.startTime ?? new Date()}
                                                onChange={(date) => setFormData({ ...formData, startTime: date })}
                                                label="Start Time"
                                            />
                                            <SafeDateTimeInput
                                                value={formData.endTime ?? new Date()}
                                                onChange={(date) => setFormData({ ...formData, endTime: date })}
                                                label="End Time"
                                            />
                                        </div>
                                        <div>
                                            <Label htmlFor="duration" className="">Duration</Label>
                                            <div className="flex items-center gap-2">
                                                <div className="relative flex-1">
                                                    <Input
                                                        id="duration"
                                                        type="number"
                                                        min="1"
                                                        value={formData.duration}
                                                        onChange={(e) => {
                                                            const value = Math.max(1, parseInt(e.target.value) || 0);
                                                            setFormData({ ...formData, duration: value });
                                                        }}
                                                        className="pr-16 dark:bg-gray-900"
                                                    />
                                                    <span className="absolute  right-3 top-1/2 -translate-y-1/2 text-gray-500 dark:text-indigo-300">
                                                        minutes
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                        <div>
                                            <Label className="text-indigo-900 dark:text-indigo-100 mb-2 block">Classes</Label>
                                            <div className="grid grid-cols-2 gap-2">
                                                {courses.map(course => (
                                                    <div key={course.id} className="flex items-center space-x-2 bg-white dark:bg-gray-900 p-2 rounded-lg shadow-sm">
                                                        <Checkbox
                                                            id={course.id}
                                                            checked={formData.courseIds?.includes(course.id) || false}
                                                            onCheckedChange={() => handleCourseChange(course.id)}
                                                            className="dark:border-gray-500"
                                                        />
                                                        <Label htmlFor={course.id} className="text-sm dark:text-gray-200">
                                                            {course.class.name} ({course.code})
                                                        </Label>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            <Label className="text-indigo-900 dark:text-indigo-100">Settings</Label>
                                            <div className="grid grid-cols-2 gap-4">
                                                {settingsFields.map((key) => (
                                                    <div key={key} className="flex items-center space-x-2 bg-white dark:bg-gray-900 p-2 rounded-lg shadow-sm">
                                                        <Checkbox
                                                            id={key}
                                                            checked={formData.settings?.[key] || false}
                                                            onCheckedChange={(checked) =>
                                                                setFormData({
                                                                    ...formData,
                                                                    settings: {
                                                                        ...formData.settings,
                                                                        [key]: checked
                                                                    }
                                                                })
                                                            }
                                                            className="dark:border-slate-600"
                                                        />
                                                        <Label htmlFor={key} className="text-sm dark:text-slate-200">
                                                            {key.charAt(0).toUpperCase() + key.slice(1)}
                                                        </Label>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                        <Button
                                            type="submit"
                                            className="w-full bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600 text-white transition-colors duration-300"
                                        >
                                            {editMode ? 'Update Quiz' : 'Create Quiz'}
                                        </Button>
                                    </form>
                                </div>
                            </DialogContent>
                        </Dialog>
                    </div>
                </header>

                <div className="bg-white dark:bg-slate-800/50 rounded-lg shadow-md p-4 mb-6 backdrop-blur-sm">
                    <div className="flex flex-col sm:flex-row gap-4">
                        <div className="flex-1 relative">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                            <Input
                                placeholder="Search quizzes..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-9 dark:bg-gray-700"
                            />
                        </div>
                        <div className="flex gap-2">
                            <Select value={sortBy} onValueChange={(value: any) => setSortBy(value)}>
                                <SelectTrigger className="w-[140px]">
                                    <SelectValue placeholder="Sort by" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="date">Date</SelectItem>
                                    <SelectItem value="title">Title</SelectItem>
                                    <SelectItem value="status">Status</SelectItem>
                                </SelectContent>
                            </Select>
                            <Select value={filterStatus} onValueChange={(value: any) => setFilterStatus(value)}>
                                <SelectTrigger className="w-[140px]">
                                    <SelectValue placeholder="Filter status" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Status</SelectItem>
                                    <SelectItem value="upcoming">Upcoming</SelectItem>
                                    <SelectItem value="active">Active</SelectItem>
                                    <SelectItem value="completed">Completed</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                </div>

                {viewMode === 'table' ? (
                    <div className="rounded-lg overflow-hidden border dark:border-slate-700 bg-white dark:bg-slate-800/50 backdrop-blur-sm">
                        <Table>
                            <TableHeader>
                                <TableRow className="dark:border-gray-700">
                                    <TableHead className="dark:text-gray-200">Status</TableHead>
                                    <TableHead className="dark:text-gray-200">Title</TableHead>
                                    <TableHead className="dark:text-gray-200">Description</TableHead>
                                    <TableHead className="dark:text-gray-200">Start Time</TableHead>
                                    <TableHead className="dark:text-gray-200">End Time</TableHead>
                                    <TableHead className="dark:text-gray-200">Duration (mins)</TableHead>
                                    <TableHead className="dark:text-gray-200">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredAndSortedQuizzes.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={7} className="text-center dark:text-gray-300">
                                            No quizzes found
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    filteredAndSortedQuizzes.map((quiz) => {
                                        const { icon, color } = getQuizStatus(quiz.startTime, quiz.endTime);
                                        return (
                                            <TableRow key={quiz.id} className="dark:border-gray-700">
                                                <TableCell className={`${color} dark:text-gray-200`}>
                                                    <div className={color}>{icon}</div>
                                                </TableCell>
                                                <TableCell className="dark:text-gray-200">{quiz.title}</TableCell>
                                                <TableCell className="dark:text-gray-200">{quiz.description}</TableCell>
                                                <TableCell className="dark:text-gray-200">
                                                    {new Date(quiz.startTime).toLocaleDateString('en-GB', {
                                                        day: '2-digit',
                                                        month: 'short',
                                                        year: 'numeric',
                                                        hour: '2-digit',
                                                        minute: '2-digit',
                                                        hourCycle: 'h12'
                                                    })}
                                                </TableCell>
                                                <TableCell className="dark:text-gray-200">
                                                    {new Date(quiz.endTime).toLocaleDateString('en-GB', {
                                                        day: '2-digit',
                                                        month: 'short',
                                                        year: 'numeric',
                                                        hour: '2-digit',
                                                        minute: '2-digit',
                                                        hourCycle: 'h12'
                                                    })}
                                                </TableCell>
                                                <TableCell className="dark:text-gray-200">{quiz.duration}</TableCell>
                                                <TableCell>
                                                    <DropdownMenu>
                                                        <DropdownMenuTrigger asChild>
                                                            <Button variant="ghost" className="h-8 w-8 p-0">
                                                                <MoreHorizontal className="h-4 w-4" />
                                                            </Button>
                                                        </DropdownMenuTrigger>
                                                        <DropdownMenuContent align="end" className="dark:bg-slate-800 dark:border-slate-700">
                                                            <DropdownMenuItem onClick={() => handleEdit(quiz)} className="dark:hover:bg-slate-700">
                                                                <Pencil className="h-4 w-4 mr-2" />
                                                                Edit
                                                            </DropdownMenuItem>
                                                            <DropdownMenuItem onClick={() => router.push(`/staff/quiz/${quiz.id}`)} className="dark:hover:bg-slate-700">
                                                                <SquareChartGantt className="h-4 w-4 mr-2" />
                                                                Questions
                                                            </DropdownMenuItem>
                                                            <DropdownMenuItem onClick={() => router.push(`/staff/quiz/result/${quiz.id}`)} className="dark:hover:bg-slate-700">
                                                                <FileBadge2 className="h-4 w-4 mr-2" color="green" />
                                                                Results
                                                            </DropdownMenuItem>
                                                            <DropdownMenuItem
                                                                onClick={() => handleDelete(quiz.id)}
                                                                className="text-red-600 dark:text-red-400 dark:hover:bg-red-900/20"
                                                            >
                                                                <Trash2 className="h-4 w-4 mr-2" />
                                                                Delete
                                                            </DropdownMenuItem>
                                                        </DropdownMenuContent>
                                                    </DropdownMenu>
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })
                                )}
                            </TableBody>
                        </Table>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 gap-6">
                        <AnimatePresence>
                            {filteredAndSortedQuizzes.map((quiz) => (
                                <QuizCard
                                    key={quiz.id}
                                    quiz={quiz}
                                    onEdit={handleEdit}
                                    onDelete={handleDelete}
                                    router={router}
                                />
                            ))}
                        </AnimatePresence>
                    </div>
                )}
            </div>
        </div>
    );
}

