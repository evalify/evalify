'use client';

import React, { useEffect, useState } from 'react';
import { Pencil, SquareChartGantt, Trash2 } from 'lucide-react'; // Add this import
import { Button } from '@/components/ui/button';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
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
        id: string;
        fullscreen: boolean;
        calculator: boolean;
        shuffle: boolean;
    };
    courses: Course[];
};

export default function QuizPage() {
    const router = useRouter();
    const [quizzes, setQuizzes] = useState<Quiz[]>([]);
    const [open, setOpen] = useState(false);
    const [editMode, setEditMode] = useState(false);
    const [formData, setFormData] = useState<Partial<Quiz>>({
        title: '',
        description: '',
        startTime: new Date(),
        endTime: new Date(),
        duration: 0,
        settings: {
            fullscreen: false,
            calculator: false,
            shuffle: false,
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
            // The data is already an array of quizzes, no need to access data.data
            setQuizzes(data.map((quiz: Quiz) => ({
                ...quiz,
                startTime: new Date(quiz.startTime),
                endTime: new Date(quiz.endTime)
            })));
        } catch (error) {
            console.error('Error fetching quizzes:', error);
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
            console.error('Error fetching courses:', error);
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
            },
            courseIds: [],
        });
        setEditMode(false);
    };

    const handleEdit = (quiz: Quiz) => {
        setEditMode(true);
        setFormData({
            id: quiz.id,
            title: quiz.title,
            description: quiz.description,
            startTime: new Date(quiz.startTime),
            endTime: new Date(quiz.endTime),
            duration: quiz.duration,
            settings: quiz.settings,
            courseIds: quiz.courses.map(course => course.id),
        });
        setOpen(true);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const endpoint = '/api/staff/quiz';
            const method = editMode ? 'PUT' : 'POST';

            const requestData = {
                ...formData,
                startTime: formData.startTime?.toISOString(),
                endTime: formData.endTime?.toISOString(),
                settingsId: editMode ? formData.settings?.id : undefined,
                settings: {
                    ...formData.settings,
                    id: editMode ? formData.settings?.id : undefined
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
            console.error(`Error ${editMode ? 'updating' : 'creating'} quiz:`, error);
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
            console.error('Delete error:', error);
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
                    <DialogContent className="w-full max-w-lg overflow-auto">
                        <DialogHeader>
                            <DialogTitle>
                                {editMode ? 'Edit Quiz' : 'Create New Quiz'}
                            </DialogTitle>
                        </DialogHeader>
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
                                    <DateTimePicker
                                        value={formData.startTime}
                                        onChange={(date) => setFormData({ ...formData, startTime: date })}
                                    />
                                </div>
                                <div>
                                    <Label htmlFor="endTime">End Time</Label>
                                    <DateTimePicker
                                        value={formData.endTime}
                                        onChange={(date) => setFormData({ ...formData, endTime: date })}
                                    />
                                </div>
                            </div>
                            <div>
                                <Label htmlFor="duration">Duration (minutes)</Label>
                                <Input
                                    id="duration"
                                    type="number"
                                    value={formData.duration}
                                    onChange={(e) => setFormData({ ...formData, duration: Number(e.target.value) })}
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
                    </DialogContent>
                </Dialog>
            </div>

            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Title</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead>Start Time</TableHead>
                        <TableHead>End Time</TableHead>
                        <TableHead>Duration</TableHead>
                        <TableHead>Course</TableHead>
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
                        quizzes.map((quiz) => (
                            <TableRow key={quiz.id}>
                                <TableCell>{quiz.title}</TableCell>
                                <TableCell>{quiz.description}</TableCell>
                                <TableCell>{new Date(quiz.startTime).toLocaleString()}</TableCell>
                                <TableCell>{new Date(quiz.endTime).toLocaleString()}</TableCell>
                                <TableCell>{quiz.duration} minutes</TableCell>
                                <TableCell>
                                    {quiz.courses?.map(c => c.class.name).join(', ') ?? 'N/A'}
                                </TableCell>
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
                                            onClick={()=>{
                                                router.push(`/staff/quiz/${quiz.id}`);
                                            }}
                                        >
                                            <SquareChartGantt className="h-4 w-4" />
                                        </Button>
                                        <Button 
                                            variant="ghost" 
                                            size="icon"
                                            onClick={() => handleDelete(quiz.id)}
                                            className="text-destructive"
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </TableCell>
                            </TableRow>
                        ))
                    )}
                </TableBody>
            </Table>
        </div>
    );
}

