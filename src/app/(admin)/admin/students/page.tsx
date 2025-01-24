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
import { useState, useEffect, useCallback, useTransition, Fragment } from "react";
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
import debounce from 'lodash/debounce';
import {
    Pagination,
    PaginationContent,
    PaginationEllipsis,
    PaginationItem,
    PaginationLink,
    PaginationNext,
    PaginationPrevious,
} from "@/components/ui/pagination"
import { createUserWithRole } from "@/lib/actions/user-actions";

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
    const [selectAll, setSelectAll] = useState(false);
    const [resetDialogOpen, setResetDialogOpen] = useState(false);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [isPending, startTransition] = useTransition();
    const [isSearching, setIsSearching] = useState(false);
    const [createDialogOpen, setCreateDialogOpen] = useState(false);
    const [newStudent, setNewStudent] = useState({ name: '', email: '', rollNo: '' });
    const router = useRouter();

    const fetchStudents = async (currentPage: number, searchQuery: string = "") => {
        try {
            setLoading(true);
            setError(null);

            const res = await fetch(
                `/api/admin/students?search=${encodeURIComponent(searchQuery)}&page=${currentPage}&limit=50`,
                {
                    cache: 'no-store',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                }
            );

            if (!res.ok) {
                throw new Error(`HTTP error! status: ${res.status}`);
            }

            const data = await res.json();
            setStudents(data.students);
            setTotalPages(data.pages || 1);
            setIsSearching(!!searchQuery);
        } catch (err) {
            console.log('Error fetching students:', err);
            setError(err instanceof Error ? err.message : 'Failed to fetch students');
            setStudents([]);
            setTotalPages(1);
        } finally {
            setLoading(false);
        }
    };

    const debouncedSearch = useCallback(
        debounce((searchTerm: string) => {
            setPage(1);
            if (searchTerm.trim().length > 0) {
                setIsSearching(true);
                fetchStudents(1, searchTerm.trim());
            } else {
                setIsSearching(false);
                fetchStudents(1, "");
            }
        }, 300),
        []
    );

    useEffect(() => {
        debouncedSearch(search);
        return () => {
            debouncedSearch.cancel();
        };
    }, [search]);

    useEffect(() => {
        if (!loading && !isSearching) {
            fetchStudents(page, "");
        }
    }, [page]);

    useEffect(() => {
        const fetchClasses = async () => {
            const res = await fetch('/api/admin/classes');
            const data = await res.json();
            setClasses(data);
        };
        fetchClasses();
    }, []);

    useEffect(() => {
        setSelected([]);
        setSelectAll(false);
    }, [students]);

    const toggleStudent = (id: string) => {
        setSelected(prev =>
            prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]
        );
    };

    const handleSelectAll = () => {
        if (selectAll) {
            setSelected([]);
        } else {
            setSelected(students.map(student => student.id));
        }
        setSelectAll(!selectAll);
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

                fetchStudents(page);
            }
        } catch (error) {
            console.log('Failed to assign class:', error);
        }
    };

    const handleResetPassword = async () => {
        try {
            const res = await fetch('/api/admin/students/reset-password', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    studentIds: selected,
                }),
            });

            if (res.ok) {
                setSelected([]);
                setResetDialogOpen(false);
                alert('Passwords reset successfully');
            }
        } catch (error) {
            console.log('Failed to reset passwords:', error);
            alert('Failed to reset passwords');
        }
    };

    const handleCreateStudent = async () => {
        try {
            if (!newStudent.rollNo) {
                toast({
                    variant: "destructive",
                    title: "Error",
                    description: "Roll number is required"
                });
                return;
            }
            
            await createUserWithRole({
                ...newStudent,
                role: 'STUDENT'
            });
            setCreateDialogOpen(false);
            setNewStudent({ name: '', email: '', rollNo: '' });
            fetchStudents(page);
            toast({
                title: "Success",
                description: "Student created successfully"
            });
        } catch (error) {
            toast({
                variant: "destructive",
                title: "Error",
                description: error instanceof Error ? error.message : "Failed to create student"
            });
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
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                                debouncedSearch(search);
                            }
                        }}
                    />
                    {isSearching && (
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                                setSearch("");
                                setIsSearching(false);
                                fetchStudents(1, "");
                            }}
                        >
                            Clear Search
                        </Button>
                    )}
                </div>
                <div className="flex gap-2">
                    <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
                        <DialogTrigger asChild>
                            <Button>Create Student</Button>
                        </DialogTrigger>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>Create New Student</DialogTitle>
                            </DialogHeader>
                            <div className="flex flex-col gap-4">
                                <Input
                                    placeholder="Name"
                                    value={newStudent.name}
                                    onChange={(e) => setNewStudent(prev => ({ ...prev, name: e.target.value }))}
                                />
                                <Input
                                    placeholder="Email"
                                    type="email"
                                    value={newStudent.email}
                                    onChange={(e) => setNewStudent(prev => ({ ...prev, email: e.target.value }))}
                                />
                                <Input
                                    placeholder="Roll Number"
                                    value={newStudent.rollNo}
                                    onChange={(e) => setNewStudent(prev => ({ ...prev, rollNo: e.target.value }))}
                                />
                                <Button onClick={handleCreateStudent}>Create</Button>
                            </div>
                        </DialogContent>
                    </Dialog>
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
                    <Dialog open={resetDialogOpen} onOpenChange={setResetDialogOpen}>
                        <DialogTrigger asChild>
                            <Button
                                variant="destructive"
                                disabled={selected.length === 0}
                            >
                                Reset Passwords
                            </Button>
                        </DialogTrigger>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>Confirm Password Reset</DialogTitle>
                            </DialogHeader>
                            <div className="flex flex-col gap-4">
                                <p>Are you sure you want to reset passwords for {selected.length} students?</p>
                                <p className="text-sm text-muted-foreground">Their passwords will be reset to their roll numbers.</p>
                                <div className="flex justify-end gap-2">
                                    <Button variant="outline" onClick={() => setResetDialogOpen(false)}>
                                        Cancel
                                    </Button>
                                    <Button variant="destructive" onClick={handleResetPassword}>
                                        Reset Passwords
                                    </Button>
                                </div>
                            </div>
                        </DialogContent>
                    </Dialog>
                </div>
            </div>

            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead className="w-12">
                            <Checkbox
                                checked={selectAll}
                                onCheckedChange={handleSelectAll}
                                disabled={loading || students.length === 0}
                            />
                        </TableHead>
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

            {!loading && !error && students.length > 0 && !isSearching && (
                <div className="mt-4 flex justify-center">
                    <Pagination>
                        <PaginationContent>
                            <PaginationItem>
                                <PaginationPrevious
                                    onClick={() => setPage(p => Math.max(1, p - 1))}
                                    disabled={page === 1 || loading}
                                />
                            </PaginationItem>
                            {Array.from({ length: totalPages }, (_, i) => i + 1)
                                .filter(p => p === 1 || p === totalPages || Math.abs(p - page) <= 2)
                                .map((p, i, arr) => (
                                    <Fragment key={p}>
                                        {i > 0 && arr[i - 1] !== p - 1 && (
                                            <PaginationItem>
                                                <PaginationEllipsis />
                                            </PaginationItem>
                                        )}
                                        <PaginationItem>
                                            <PaginationLink
                                                isActive={page === p}
                                                onClick={() => setPage(p)}
                                            >
                                                {p}
                                            </PaginationLink>
                                        </PaginationItem>
                                    </Fragment>
                                ))}
                            <PaginationItem>
                                <PaginationNext
                                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                                    disabled={page === totalPages || loading}
                                />
                            </PaginationItem>
                        </PaginationContent>
                    </Pagination>
                </div>
            )}

            {isPending && (
                <div className="fixed bottom-4 right-4 bg-primary text-primary-foreground px-4 py-2 rounded-md">
                    Updating students...
                </div>
            )}
        </div>
    );
}