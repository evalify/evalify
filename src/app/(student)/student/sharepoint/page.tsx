'use client';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2 } from "lucide-react";
import UnderDev from '@/components/under-dev';

interface Class {
    id: string;
    name: string;
    department: string;
    semester: string;
    batch: string;
    sharePoint: string | null;
}

interface Course {
    id: string;
    name: string;
    code: string;
    classId: string;
    staffId: string | null;
    semesterId: string | null;
    isactive: boolean;
    sharePoint: string | null;
    class: Class;
}

export default function SharePointPage() {
    const [courses, setCourses] = useState<Course[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const router = useRouter();
    const { data: session } = useSession();

    useEffect(() => {
        const fetchCourses = async () => {
            try {
                setIsLoading(true);
                const response = await fetch('/api/student/courses');
                if (!response.ok) {
                    throw new Error('Failed to fetch courses');
                }
                const data = await response.json();
                setCourses(data || []);
            } catch (err) {
                setError(err instanceof Error ? err.message : 'Failed to load courses');
            } finally {
                setIsLoading(false);
            }
        };
        fetchCourses();
    }, []);

    return (
        <UnderDev featureName="Sharepoint" message='Course-wise Files can be shared and accessed here.' />
    )

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <Loader2 className="h-8 w-8 animate-spin" />
            </div>
        );
    }

    if (error) {
        return (
            <div className="container mx-auto p-6">
                <p className="text-red-500">Error: {error}</p>
            </div>
        );
    }

    return (
        <div className="container mx-auto p-6">
            <h1 className="text-2xl font-bold mb-6">Course SharePoints</h1>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {courses.length === 0 ? (
                    <p className="text-gray-500 col-span-full text-center">No courses found</p>
                ) : (
                    courses.map((course) => (
                        <Card key={course.id} className="cursor-pointer hover:shadow-lg"
                            onClick={() => router.push(`/student/sharepoint/${course.id}`)}>
                            <CardHeader>
                                <CardTitle>{course.name}</CardTitle>
                                <p className="text-sm text-gray-500">{course.code}</p>
                                <p className="text-sm text-gray-500">Class: {course.class.name}</p>
                                <p className="text-sm text-gray-500">
                                    {course.sharePoint || course.class.sharePoint ? 'SharePoint Available' : 'No SharePoint'}
                                </p>
                            </CardHeader>
                        </Card>
                    ))
                )}
            </div>
        </div>
    );
}