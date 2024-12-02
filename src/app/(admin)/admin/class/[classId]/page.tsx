'use client';

import { use, useEffect, useState } from 'react';
import Link from 'next/link';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Search } from 'lucide-react';
import Loading from './loading';
import { useToast } from '@/components/hooks/use-toast';

interface Student {
    id: string;
    name: string;
    email: string;
    rollNo: string;
}

interface ClassDetails {
    name: string;
    department: string;
    semester: string;
    batch: string;
    _count?: {
        students: number;
    }
}

export default function ClassStudentsPage({ params }: { params: Promise<{ classId: string }> }) {
    const resolvedParams = use(params);
    const [students, setStudents] = useState<Student[]>([]);
    const [classDetails, setClassDetails] = useState<ClassDetails | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const { toast } = useToast();

    const fetchClassDetails = async () => {
        try {
            const response = await fetch(`/api/admin/classes/${resolvedParams.classId}`);
            if (!response.ok) throw new Error('Failed to fetch class details');
            const data = await response.json();
            setClassDetails(data);
        } catch (error) {
            console.error('Error fetching class details:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const fetchStudents = async () => {
        try {
            const response = await fetch(`/api/admin/students?classId=${resolvedParams.classId}`, {
                method: 'GET',
                headers: {
                    'Cache-Control': 'no-cache'
                }
            });
            
            const text = await response.text();
            const data = text ? JSON.parse(text) : [];
            
            if (Array.isArray(data)) {
                setStudents(data);
            } else {
                setStudents([]);
                throw new Error('Invalid data format');
            }
        } catch (error) {
            console.error('Error fetching students:', error);
            setStudents([]);
            toast({
                variant: "destructive",
                title: "Error",
                description: "Could not load students. Please try refreshing the page."
            });
        }
    };

    useEffect(() => {
        Promise.all([fetchClassDetails(), fetchStudents()]).catch(error => {
            console.error('Error loading page data:', error);
            toast({
                variant: "destructive",
                title: "Error",
                description: "Failed to load page data"
            });
        });
    }, [resolvedParams.classId]);

    if (isLoading) {
        return <div className="animate-pulse">
            <Loading />
        </div>;
    }

    const filteredStudents = students.filter((student) =>
        Object.values(student).some((value) =>
            value.toString().toLowerCase().includes(searchQuery.toLowerCase())
        )
    );

    return (
        <div className="p-6">
            {classDetails && (
                <div className="mb-6">
                    <h1 className="text-2xl font-bold mb-2">{classDetails.name}</h1>
                    <p className="text-gray-600">
                        Department: {classDetails.department} | Semester: {classDetails.semester} | 
                        Batch: {classDetails.batch} | Students: {students.length}
                    </p>
                </div>
            )}

            <div className="flex items-center space-x-2 mb-4">
                <div className="relative flex-1">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Search students..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-8"
                    />
                </div>
            </div>

            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Roll No</TableHead>
                        <TableHead>Name</TableHead>
                        <TableHead>Email</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {filteredStudents.map((student) => (
                        <TableRow key={student.id}>
                            <TableCell>{student.rollNo}</TableCell>
                            <TableCell>
                                <Link 
                                    href={`/profile?profile=${student.email}`}
                                    className="text-blue-600 hover:underline cursor-pointer"
                                >
                                    {student.name}
                                </Link>
                            </TableCell>
                            <TableCell>{student.email}</TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </div>
    );
}