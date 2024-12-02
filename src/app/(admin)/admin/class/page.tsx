'use client';

import { useEffect, useState } from 'react';
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Search, Trash2 } from 'lucide-react';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { PlusCircle, Pencil } from 'lucide-react';
import { useToast } from '@/components/hooks/use-toast';
import Link from 'next/link';

interface Class {
    id: string;
    name: string;
    department: string;
    semester: string;
    batch: string;
    _count?: {
        students: number;
    }
}

export default function ClassPage() {
    const [classes, setClasses] = useState<Class[]>([]);
    const [isOpen, setIsOpen] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [currentClass, setCurrentClass] = useState<Class | null>(null);
    const { toast } = useToast();
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedClasses, setSelectedClasses] = useState<string[]>([]);

    const fetchClasses = async () => {
        const response = await fetch('/api/admin/classes');
        const data = await response.json();
        setClasses(data);
    };

    useEffect(() => {
        fetchClasses();
    }, []);

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);
        const classData = {
            name: formData.get('name'),
            department: formData.get('department'),
            semester: formData.get('semester'),
            batch: formData.get('batch'),
        };

        const url = '/api/admin/classes';
        const method = isEditing ? 'PUT' : 'POST';
        const body = isEditing ? { ...classData, id: currentClass?.id } : classData;

        try {
            const response = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
            });

            if (response.ok) {
                toast({
                    description: `Class ${isEditing ? 'updated' : 'created'} successfully`,
                });
                fetchClasses();
                setIsOpen(false);
                setCurrentClass(null);
            }
        } catch (error) {
            toast({
                variant: "destructive",
                description: "Something went wrong",
            });
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure you want to delete this class?')) return;

        try {
            const response = await fetch(`/api/admin/classes?id=${id}`, {
                method: 'DELETE',
            });

            if (response.ok) {
                toast({
                    description: "Class deleted successfully",
                });
                fetchClasses();
            }
        } catch (error) {
            toast({
                variant: "destructive",
                description: "Failed to delete class",
            });
        }
    };

    const filteredClasses = classes.filter((cls) =>
        Object.values(cls).some((value) =>
            value.toString().toLowerCase().includes(searchQuery.toLowerCase())
        )
    );

    const handleSelectAll = (checked: boolean) => {
        setSelectedClasses(checked ? filteredClasses.map(cls => cls.id) : []);
    };

    const handleSelectClass = (id: string, checked: boolean) => {
        setSelectedClasses(prev =>
            checked ? [...prev, id] : prev.filter(classId => classId !== id)
        );
    };

    const handleBulkDelete = async () => {
        if (!confirm(`Are you sure you want to delete ${selectedClasses.length} classes?`)) return;

        try {
            const promises = selectedClasses.map(id =>
                fetch(`/api/admin/classes?id=${id}`, { method: 'DELETE' })
            );
            await Promise.all(promises);

            toast({
                description: "Selected classes deleted successfully",
            });
            fetchClasses();
            setSelectedClasses([]);
        } catch (error) {
            toast({
                variant: "destructive",
                description: "Failed to delete classes",
            });
        }
    };

    return (
        <div className="p-6">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold">Class Management</h1>
                <div className="flex items-center gap-4">
                    {selectedClasses.length > 0 && (
                        <Button
                            variant="destructive"
                            onClick={handleBulkDelete}
                            className="flex items-center"
                        >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete Selected ({selectedClasses.length})
                        </Button>
                    )}
                    <Dialog open={isOpen} onOpenChange={setIsOpen}>
                        <DialogTrigger asChild>
                            <Button onClick={() => {
                                setIsEditing(false);
                                setCurrentClass(null);
                            }}>
                                <PlusCircle className="mr-2 h-4 w-4" />
                                Add Class
                            </Button>
                        </DialogTrigger>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>{isEditing ? 'Edit Class' : 'Add New Class'}</DialogTitle>
                            </DialogHeader>
                            <form onSubmit={handleSubmit} className="space-y-4">
                                <div className="grid w-full gap-2">
                                    <Label htmlFor="name">Name</Label>
                                    <Input
                                        id="name"
                                        name="name"
                                        defaultValue={currentClass?.name}
                                        required
                                    />
                                </div>
                                <div className="grid w-full gap-2">
                                    <Label htmlFor="department">Department</Label>
                                    <Input
                                        id="department"
                                        name="department"
                                        defaultValue={currentClass?.department}
                                        required
                                    />
                                </div>
                                <div className="grid w-full gap-2">
                                    <Label htmlFor="semester">Semester</Label>
                                    <Input
                                        id="semester"
                                        name="semester"
                                        defaultValue={currentClass?.semester}
                                        required
                                    />
                                </div>
                                <div className="grid w-full gap-2">
                                    <Label htmlFor="batch">Batch</Label>
                                    <Input
                                        id="batch"
                                        name="batch"
                                        defaultValue={currentClass?.batch}
                                        required
                                    />
                                </div>
                                <Button type="submit" className="w-full">
                                    {isEditing ? 'Update' : 'Create'} Class
                                </Button>
                            </form>
                        </DialogContent>
                    </Dialog>
                </div>
            </div>

            <div className="flex items-center space-x-2 mb-4">
                <div className="relative flex-1">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Search classes..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-8"
                    />
                </div>
            </div>

            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead className="w-12">
                            <Checkbox
                                checked={selectedClasses.length === filteredClasses.length}
                                onCheckedChange={handleSelectAll}
                                aria-label="Select all"
                            />
                        </TableHead>
                        <TableHead>Name</TableHead>
                        <TableHead>Department</TableHead>
                        <TableHead>Semester</TableHead>
                        <TableHead>Batch</TableHead>
                        <TableHead>Students</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {filteredClasses.map((cls) => (
                        <TableRow key={cls.id}>
                            <TableCell>
                                <Checkbox
                                    checked={selectedClasses.includes(cls.id)}
                                    onCheckedChange={(checked) => 
                                        handleSelectClass(cls.id, checked as boolean)
                                    }
                                    aria-label={`Select ${cls.name}`}
                                />
                            </TableCell>
                            <TableCell>
                                <Link 
                                    href={`/admin/class/${cls.id}`} 
                                    className="text-blue-600 hover:underline cursor-pointer"
                                >
                                    {cls.name}
                                </Link>
                            </TableCell>
                            <TableCell>{cls.department}</TableCell>
                            <TableCell>{cls.semester}</TableCell>
                            <TableCell>{cls.batch}</TableCell>
                            <TableCell>{cls._count?.students || 0}</TableCell>
                            <TableCell className="text-right space-x-2">
                                <Button
                                    variant="outline"
                                    size="icon"
                                    onClick={() => {
                                        setCurrentClass(cls);
                                        setIsEditing(true);
                                        setIsOpen(true);
                                    }}
                                >
                                    <Pencil className="h-4 w-4" />
                                </Button>
                                <Button
                                    variant="outline"
                                    size="icon"
                                    onClick={() => handleDelete(cls.id)}
                                >
                                    <Trash2 className="h-4 w-4" />
                                </Button>
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </div>
    );
}
