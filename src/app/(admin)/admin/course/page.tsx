'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table'
import { useToast } from '@/components/hooks/use-toast'

interface Staff {
    id: string
    user: { name: string }
}

interface Class {
    id: string
    name: string
}

interface Course {
    id: string
    name: string
    code: string
    classId: string
    staffId: string | null
    isactive: boolean
    class: {
        name: string
    }
    staff?: {
        user: {
            name: string
        }
    }
}

export default function CoursePage() {
    const [courses, setCourses] = useState<Course[]>([])
    const [staff, setStaff] = useState<Staff[]>([])
    const [classes, setClasses] = useState<Class[]>([])
    const [searchQuery, setSearchQuery] = useState('')
    const [selectedCourses, setSelectedCourses] = useState<string[]>([])
    const [isDialogOpen, setIsDialogOpen] = useState(false)
    const [formData, setFormData] = useState({
        id: '',
        name: '',
        code: '',
        classId: 'dfsgsdfg',
        staffId: 'nosdfgsdfgne',
    })
    const [isEditing, setIsEditing] = useState(false)
    const { toast } = useToast()

    useEffect(() => {
        fetchCourses()
        fetchStaffAndClasses()
    }, [])

    const fetchCourses = async () => {
        const response = await fetch('/api/admin/courses')
        const data = await response.json()
        setCourses(data)
    }

    const fetchStaffAndClasses = async () => {
        const [staffResponse, classesResponse] = await Promise.all([
            fetch('/api/admin/staff'),
            fetch('/api/admin/classes')
        ])
        const [staffData, classesData] = await Promise.all([
            staffResponse.json(),
            classesResponse.json()
        ])
        setStaff(staffData)
        setClasses(classesData)
    }

    const filteredCourses = courses.filter(course =>
        course.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        course.code.toLowerCase().includes(searchQuery.toLowerCase())
    )

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()

        if (!formData.classId) {
            toast({
                title: 'Error',
                description: 'Please select a class',
                variant: 'destructive',
            })
            return
        }

        const method = isEditing ? 'PUT' : 'POST'
        const submitData = {
            ...formData,
            staffId: formData.staffId || null
        }

        try {
            const response = await fetch('/api/admin/courses', {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(submitData),
            })

            if (!response.ok) throw new Error('Failed to save course')

            toast({
                title: `Course ${isEditing ? 'updated' : 'created'} successfully`,
                variant: 'default',
            })

            resetForm()
            fetchCourses()
            setIsDialogOpen(false)
        } catch (error) {
            toast({
                title: 'Error',
                description: 'Failed to save course',
                variant: 'destructive',
            })
        }
    }

    const handleDelete = async (id: string) => {
        try {
            const response = await fetch(`/api/admin/courses?id=${id}`, {
                method: 'DELETE',
            })

            if (!response.ok) throw new Error('Failed to delete course')

            toast({
                title: 'Course deleted successfully',
                variant: 'default',
            })

            fetchCourses()
        } catch (error) {
            toast({
                title: 'Error',
                description: 'Failed to delete course',
                variant: 'destructive',
            })
        }
    }

    const handleDeleteSelected = async () => {
        try {
            await Promise.all(
                selectedCourses.map(id =>
                    fetch(`/api/admin/courses?id=${id}`, { method: 'DELETE' })
                )
            )
            toast({
                title: 'Selected courses deleted successfully',
                variant: 'default',
            })
            setSelectedCourses([])
            fetchCourses()
        } catch (error) {
            toast({
                title: 'Error',
                description: 'Failed to delete courses',
                variant: 'destructive',
            })
        }
    }

    const resetForm = () => {
        setFormData({
            id: '',
            name: '',
            code: '',
            classId: '',
            staffId: '',
        })
        setIsEditing(false)
    }

    return (
        <div className="container mx-auto p-4">
            <div className="flex justify-between items-center mb-4">
                <h1 className="text-2xl font-bold">Course Management</h1>
                <div className="flex gap-4">
                    <Input
                        placeholder="Search courses..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-64"
                    />
                    <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                        <DialogTrigger asChild>
                            <Button onClick={resetForm}>Add Course</Button>
                        </DialogTrigger>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>{isEditing ? 'Edit Course' : 'Add New Course'}</DialogTitle>
                            </DialogHeader>
                            <form onSubmit={handleSubmit} className="space-y-4">
                                <Input
                                    placeholder="Course Name"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    required
                                />
                                <Input
                                    placeholder="Course Code"
                                    value={formData.code}
                                    onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                                    required
                                />
                                <Select
                                    value={formData.classId}
                                    onValueChange={(value) => setFormData({ ...formData, classId: value })}
                                    required
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select Class" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {
                                            classes &&
                                            classes.map((cls) => (
                                                <SelectItem key={cls.id} value={cls.id}>
                                                    {cls.name}
                                                </SelectItem>
                                            ))
                                        }
                                    </SelectContent>
                                </Select>
                                <Select
                                    value={formData.staffId}
                                    onValueChange={(value) => setFormData({ ...formData, staffId: value })}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select Staff (Optional)" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="df">Unassigned</SelectItem>
                                        {
                                            staff && staff.map((s) => (
                                                <SelectItem key={s.id} value={s.id}>
                                                    {s.user.name}
                                                </SelectItem>
                                            )
                                            )
                                        }
                                    </SelectContent>
                                </Select>
                                <Button type="submit">{isEditing ? 'Update' : 'Save'} Course</Button>
                            </form>
                        </DialogContent>
                    </Dialog>
                </div>
            </div>

            {selectedCourses.length > 0 && (
                <Button
                    variant="destructive"
                    onClick={handleDeleteSelected}
                    className="mb-4"
                >
                    Delete Selected ({selectedCourses.length})
                </Button>
            )}

            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead className="w-12">
                            <Checkbox
                                checked={selectedCourses.length === filteredCourses.length}
                                onCheckedChange={(checked) => {
                                    setSelectedCourses(checked
                                        ? filteredCourses.map(c => c.id)
                                        : []
                                    )
                                }}
                            />
                        </TableHead>
                        <TableHead>Name</TableHead>
                        <TableHead>Code</TableHead>
                        <TableHead>Class</TableHead>
                        <TableHead>Staff</TableHead>
                        <TableHead>Actions</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {filteredCourses.map((course) => (
                        <TableRow key={course.id}>
                            <TableCell>
                                <Checkbox
                                    checked={selectedCourses.includes(course.id)}
                                    onCheckedChange={(checked) => {
                                        setSelectedCourses(
                                            checked
                                                ? [...selectedCourses, course.id]
                                                : selectedCourses.filter(id => id !== course.id)
                                        )
                                    }}
                                />
                            </TableCell>
                            <TableCell>{course.name}</TableCell>
                            <TableCell>{course.code}</TableCell>
                            <TableCell>{course.class.name}</TableCell>
                            <TableCell>{course.staff?.user.name || 'Unassigned'}</TableCell>
                            <TableCell>
                                <Button
                                    variant="outline"
                                    className="mr-2"
                                    onClick={() => {
                                        setFormData({
                                            id: course.id,
                                            name: course.name,
                                            code: course.code,
                                            classId: course.classId,
                                            staffId: course.staffId || '',
                                        })
                                        setIsEditing(true)
                                        setIsDialogOpen(true)
                                    }}
                                >
                                    Edit
                                </Button>
                                <Button
                                    variant="destructive"
                                    onClick={() => handleDelete(course.id)}
                                >
                                    Delete
                                </Button>
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </div>
    )
}

