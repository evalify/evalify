'use client';

import ErrorBoundary from '@/components/ui/error-boundary';
import React, { useEffect, useState } from 'react';
import { Pencil, SquareChartGantt, Trash2, FileBadge2, Clock, PlayCircle, CheckCircle2 } from 'lucide-react';
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
import { DateTimePicker } from '@/components/ui/date-time-picker';
import { useRouter } from 'next/navigation';


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

const getQuizStatus = (startTime: Date, endTime: Date): { icon: React.ReactNode; color: string } => {
    const now = new Date();
    if (now < new Date(startTime)) {
        return {
            icon: <Clock className="h-4 w-4" />,
            color: 'text-blue-500'
        };
    } else if (now > new Date(endTime)) {
        return {
            icon: <CheckCircle2 className="h-4 w-4" />,
            color: 'text-gray-500'
        };
    } else {
        return {
            icon: <PlayCircle className="h-4 w-4" />,
            color: 'text-green-500'
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

const SafeDateTimePicker = ({ value, onChange }: { value: Date, onChange: (date: Date) => void }) => {
    const safeDate = isValidDate(value) ? value : new Date();
    
    return (
        <ErrorBoundary fallback={
            <div className="text-sm text-red-500">
                Invalid date. Please try again.
            </div>
        }>
            <DateTimePicker
                value={safeDate}
                onChange={onChange}
            />
        </ErrorBoundary>
    );
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
        duration: 0,
        settings: {
            fullscreen: false,
            calculator: false,
            shuffle: false,
            showResult: false,
        },
        courseIds: [],
    });
    const [courses, setCourses] = useState<Course[]>([]);

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
        setFormData({
            title: '',
            description: '',
            startTime: new Date(),
            endTime: new Date(),
            duration: 0,
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
            title: quiz.title,
            description: quiz.description,
            startTime: createSafeDate(quiz.startTime),
            endTime: createSafeDate(quiz.endTime),
            duration: quiz.duration,
            settings: quiz.settings,
            courseIds: quiz.courses.map(course => course.id),
        });
        setOpen(true);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {

            if (!isValidDate(formData.startTime) || !isValidDate(formData.endTime)) {
                toast.error('Please enter valid dates');
                return;
            }


            if (!formData.duration || formData.duration <= 0) {
                toast.error('Duration must be greater than 0');
                return;
            }

            const startTime = createSafeDate(formData.startTime);
            const endTime = createSafeDate(formData.endTime);


            if (startTime >= endTime) {
                toast.error('Start time must be before end time');
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

    return (
        <div className="p-6">
            <div className="flex justify-between mb-6">
                <h1 className="text-2xl font-bold">Quizzes</h1>
                <Dialog
                    open={open}
                    onOpenChange={(open) => {
                        setOpen(open);
                        if (!open) resetForm();
                    }}
                >
                    <DialogTrigger asChild>
                        <Button>Create Quiz</Button>
                    </DialogTrigger>
                    <DialogContent className="w-full max-w-lg">
                        <DialogHeader>
                            <DialogTitle>
                                {editMode ? 'Edit Quiz' : 'Create New Quiz'}
                            </DialogTitle>
                        </DialogHeader>
                        <div className="max-h-[80vh] overflow-y-auto pr-6">
                            <form onSubmit={handleSubmit} className="space-y-4">
                                <div>
                                    <Label htmlFor="title">Title</Label>
                                    <Input
                                        id="title"
                                        value={formData.title}
                                        onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <Label htmlFor="description">Description</Label>
                                    <Input
                                        id="description"
                                        value={formData.description}
                                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                    />
                                </div>
                                <div className="grid grid-row-2 gap-4">
                                    <div>
                                        <Label htmlFor="startTime">Start Time</Label>
                                        <SafeDateTimePicker
                                            value={formData.startTime ?? new Date()}
                                            onChange={(date) => setFormData({ ...formData, startTime: date })}
                                        />
                                    </div>
                                    <div>
                                        <Label htmlFor="endTime">End Time</Label>
                                        <SafeDateTimePicker
                                            value={formData.endTime ?? new Date()}
                                            onChange={(date) => setFormData({ ...formData, endTime: date })}
                                        />
                                    </div>
                                </div>
                                <div>
                                    <Label htmlFor="duration">Duration (minutes)</Label>
                                    <Input
                                        id="duration"
                                        type="number"
                                        min="1"
                                        value={formData.duration}
                                        onChange={(e) => {
                                            const value = Math.max(1, parseInt(e.target.value) || 0);
                                            setFormData({ ...formData, duration: value });
                                        }}
                                    />
                                </div>
                                <div>
                                    <Label htmlFor="courses">Classes</Label>
                                    <div className="flex flex-wrap gap-2">
                                        {courses.map(course => (
                                            <div key={course.id} className="flex items-center space-x-2">
                                                <Checkbox
                                                    id={course.id}
                                                    checked={formData.courseIds?.includes(course.id) || false}
                                                    onCheckedChange={() => handleCourseChange(course.id)}
                                                />
                                                <Label htmlFor={course.id}>{course.class.name} ({course.code})</Label>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Label>Settings</Label>
                                    {Object.entries(formData.settings || {}).map(([key, value]) => (
                                        <div key={key} className="flex items-center space-x-2">
                                            <Checkbox
                                                id={key}
                                                checked={value}
                                                onCheckedChange={(checked) =>
                                                    setFormData({
                                                        ...formData,
                                                        settings: { ...formData.settings, [key]: checked }
                                                    })
                                                }
                                            />
                                            <Label htmlFor={key}>{key.charAt(0).toUpperCase() + key.slice(1)}</Label>
                                        </div>
                                    ))}
                                </div>
                                <Button type="submit">
                                    {editMode ? 'Update Quiz' : 'Create Quiz'}
                                </Button>
                            </form>
                        </div>
                    </DialogContent>
                </Dialog>
            </div>

            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Status</TableHead>
                        <TableHead>Title</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead>Start Time</TableHead>
                        <TableHead>End Time</TableHead>
                        <TableHead>Duration (mins) </TableHead>
                        <TableHead>Actions</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {quizzes.length === 0 ? (
                        <TableRow>
                            <TableCell colSpan={7} className="text-center">
                                No quizzes found
                            </TableCell>
                        </TableRow>
                    ) : (
                        quizzes.map((quiz) => {
                            const { icon, color } = getQuizStatus(quiz.startTime, quiz.endTime);
                            return (
                                <TableRow key={quiz.id}>
                                    <TableCell className={color}>
                                        <div className={color}>{icon}</div>
                                    </TableCell>
                                    <TableCell>{quiz.title}</TableCell>
                                    <TableCell>{quiz.description}</TableCell>
                                    <TableCell>  {new Date(quiz.startTime).toLocaleDateString('en-GB', {
                                        day: '2-digit',
                                        month: 'short',
                                        year: 'numeric',
                                        hour: '2-digit',
                                        minute: '2-digit',
                                        hourCycle: 'h12'
                                    })}</TableCell>
                                    <TableCell>{new Date(quiz.endTime).toLocaleDateString('en-GB', {
                                        day: '2-digit',
                                        month: 'short',
                                        year: 'numeric',
                                        hour: '2-digit',
                                        minute: '2-digit',
                                        hourCycle: 'h12'
                                    })}</TableCell>
                                    <TableCell>{quiz.duration}</TableCell>
                                    <TableCell>
                                        <div className="flex gap-2">
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => handleEdit(quiz)}
                                            >
                                                <Pencil className="h-4 w-4" />
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => {
                                                    router.push(`/staff/quiz/${quiz.id}`);
                                                }}
                                            >
                                                <SquareChartGantt className="h-4 w-4" />
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => {
                                                    router.push(`/staff/quiz/result/${quiz.id}`);
                                                }}
                                            >
                                                <FileBadge2 className="h-4 w-4" color='green' />
                                            </Button>
                                            <Dialog>
                                                <DialogTrigger className="text-destructive">
                                                    <Trash2 className="h-4 w-4" />
                                                </DialogTrigger>
                                                <DialogContent>
                                                    <DialogHeader>
                                                        <DialogTitle>Are you absolutely sure?</DialogTitle>
                                                        <DialogDescription>
                                                            This action cannot be undone. This will permanently delete the quiz.
                                                        </DialogDescription>
                                                    </DialogHeader>
                                                    <Button
                                                        variant="ghost"
                                                        onClick={() => handleDelete(quiz.id)}
                                                        className="text-destructive"
                                                    >
                                                        <Trash2 className="h-4 w-4" /> Delete Quiz
                                                    </Button>
                                                </DialogContent>
                                            </Dialog>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            );
                        })
                    )}
                </TableBody>
            </Table>
        </div>
    );
}

