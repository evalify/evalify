'use client';

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";

type Student = {
    id: string;
    name: string;
    email: string;
    rollNo: string;
    Student: Array<{
        id: string;
        class: {
            name: string;
        } | null;
    }>;
};

type Class = {
    id: string;
    name: string;
    department: string;
    semester: string;
    batch: string;
};

export default function StudentsPage() {
    const [students, setStudents] = useState<Student[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [search, setSearch] = useState("");
    const [selected, setSelected] = useState<string[]>([]);
    const [classes, setClasses] = useState<Class[]>([]);
    const [selectedClass, setSelectedClass] = useState<string>("");
    const [open, setOpen] = useState(false);
    const router = useRouter();
    const fetchStudents = async () => {
        try {
            setLoading(true);
            const res = await fetch(`/api/admin/students?search=${search}`);
            if (!res.ok) throw new Error('Failed to fetch students');
            const data = await res.json();

            if (!Array.isArray(data)) {
                throw new Error('Invalid response format');
            }

            setStudents(data);
            setError(null);
        } catch (err) {
            console.error('Error fetching students:', err);
            setError(err instanceof Error ? err.message : 'An error occurred');
            setStudents([]);
        } finally {
            setLoading(false);
        }
    };
    useEffect(() => {

        fetchStudents();
    }, [search]);

    useEffect(() => {
        const fetchClasses = async () => {
            const res = await fetch('/api/admin/classes');
            const data = await res.json();
            setClasses(data);
        };
        fetchClasses();
    }, []);

    const toggleStudent = (id: string) => {
        setSelected(prev =>
            prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]
        );
    };

    const handleAssignClass = async () => {
        if (!selectedClass || selected.length === 0) return;

        try {
            const res = await fetch('/api/admin/students', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    studentIds: selected,
                    classId: selectedClass,
                }),
            });

            if (res.ok) {
                setOpen(false);
                setSelected([]);
                router.refresh();

                fetchStudents();
            }
        } catch (error) {
            console.error('Failed to assign class:', error);
        }
    };

    return (
        <div className="container mx-auto py-10">
            <div className="flex justify-between items-center mb-6">
                <div className="flex flex-col gap-5">
                    <h1 className="text-2xl font-semibold">Students Management</h1>
                    <Input
                        placeholder="Search students..."
                        className="max-w-sm"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>
                <Dialog open={open} onOpenChange={setOpen}>
                    <DialogTrigger asChild>
                        <Button disabled={selected.length === 0}>Assign to Class</Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Assign Students to Class</DialogTitle>
                        </DialogHeader>
                        <div className="flex flex-col gap-4">
                            <Select value={selectedClass} onValueChange={setSelectedClass}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select a class" />
                                </SelectTrigger>
                                <SelectContent>
                                    {classes.map((cls) => (
                                        <SelectItem key={cls.id} value={cls.id}>
                                            {cls.name} - {cls.department} ({cls.semester})
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <Button onClick={handleAssignClass}>
                                Assign {selected.length} students
                            </Button>
                        </div>
                    </DialogContent>
                </Dialog>
            </div>

            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead className="w-12"></TableHead>
                        <TableHead>Name</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Roll No</TableHead>
                        <TableHead>Current Class</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {loading ? (
                        <TableRow>
                            <TableCell colSpan={5} className="text-center">
                                Loading...
                            </TableCell>
                        </TableRow>
                    ) : error ? (
                        <TableRow>
                            <TableCell colSpan={5} className="text-center text-red-500">
                                {error}
                            </TableCell>
                        </TableRow>
                    ) : students.length === 0 ? (
                        <TableRow>
                            <TableCell colSpan={5} className="text-center">
                                No students found
                            </TableCell>
                        </TableRow>
                    ) : (
                        students &&
                        students.map((student) => (
                            <TableRow key={student.id}>
                                <TableCell>
                                    <Checkbox
                                        checked={selected.includes(student.id)}
                                        onCheckedChange={() => toggleStudent(student.id)}
                                    />
                                </TableCell>
                                <TableCell>
                                    <Link
                                        href={`/profile?profile=${student.email}`}
                                        className="text-blue-600 hover:underline"
                                    >
                                        {student.name}
                                    </Link>
                                </TableCell>
                                <TableCell>{student.email}</TableCell>
                                <TableCell>{student.rollNo}</TableCell>
                                <TableCell>
                                    {student.Student[0]?.class?.name || "Not Assigned"}
                                </TableCell>
                            </TableRow>
                        ))
                    )}
                </TableBody>
            </Table>
        </div>
    );
}