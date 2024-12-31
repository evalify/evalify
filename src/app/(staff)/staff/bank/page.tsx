'use client'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { ScrollArea } from "@/components/ui/scroll-area"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { AlertDialog, AlertDialogContent, AlertDialogDescription, AlertDialogHeader, AlertDialogTitle, AlertDialogCancel, AlertDialogAction } from "@/components/ui/alert-dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

import { useToast } from '@/components/hooks/use-toast'
import { Bank } from '@prisma/client'
import { useRouter } from 'next/navigation'
import React, { useEffect, useState } from 'react'
import { Search, Plus, ChevronDown, LayoutGrid, Table as TableIcon } from 'lucide-react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import debounce from 'lodash/debounce'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useSession } from "next-auth/react"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"

type BankWithOwnership = Bank & {
    isOwner: boolean;
    bankOwners: Array<{
        id: string;
        user: {
            name: string;
            email: string;
        }
    }>;
}

function BankPage() {
    const { data: session } = useSession()
    const [banks, setBanks] = useState<BankWithOwnership[]>([])
    const [loading, setLoading] = useState(true)
    const [open, setOpen] = useState(false)
    const { toast } = useToast()
    const router = useRouter()
    const [shareOpen, setShareOpen] = useState(false)
    const [selectedBank, setSelectedBank] = useState<Bank | null>(null)
    const [searchTerm, setSearchTerm] = useState('')
    const [staffList, setStaffList] = useState([])
    const [sharedStaff, setSharedStaff] = useState([])
    const [searchQuery, setSearchQuery] = useState('')
    const [filterSemester, setFilterSemester] = useState('all')
    const [sortBy, setSortBy] = useState('name')
    const [editingBank, setEditingBank] = useState<BankWithOwnership | null>(null)
    const [confirmDialog, setConfirmDialog] = useState<{
        isOpen: boolean;
        action: () => Promise<void>;
        title: string;
        description: string;
    }>({
        isOpen: false,
        action: async () => {},
        title: "",
        description: ""
    });
    const [viewMode, setViewMode] = useState<'grid' | 'table'>('table')

    const fetchBanks = async () => {
        const params = new URLSearchParams({
            q: searchQuery,
            semester: filterSemester === 'all' ? '' : filterSemester,
            sort: sortBy
        })
        const res = await fetch(`/api/staff/bank?${params}`, {
            cache: 'no-store',
            headers: {
                'Cache-Control': 'no-cache, no-store, must-revalidate',
                'Pragma': 'no-cache'
            }
        })
        const data = await res.json()
        setBanks(data)
        setLoading(false)
    }

    // Debounced search
    const debouncedSearch = debounce(() => {
        fetchBanks()
    }, 300)

    useEffect(() => {
        debouncedSearch()
        return () => debouncedSearch.cancel()
    }, [searchQuery, filterSemester, sortBy])

    const handleCreate = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault()
        const formData = new FormData(e.currentTarget)
        const data = Object.fromEntries(formData)
        
        // Add validation
        if (!data.name || !data.semester) {
            toast({
                title: "Error",
                description: "Name and semester are required",
                variant: "destructive"
            })
            return
        }
        
        try {
            const res = await fetch('/api/staff/bank', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(data)
            })
            
            if (!res.ok) {
                const error = await res.json()
                throw new Error(error.message || 'Failed to create bank')
            }
            
            toast({
                title: "Success",
                description: "Bank created successfully"
            })
            setOpen(false)
            fetchBanks()
        } catch (error) {
            console.error('Create bank error:', error)
            toast({
                title: "Error",
                description: error instanceof Error ? error.message : "Failed to create bank",
                variant: "destructive"
            })
        }
    }

    const handleEdit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault()
        const formData = new FormData(e.currentTarget)
        const data = Object.fromEntries(formData)
        
        try {
            const res = await fetch(`/api/staff/bank/${editingBank?.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            })
            
            if (!res.ok) throw new Error('Failed to update bank')
            
            toast({ title: "Success", description: "Bank updated successfully" })
            setEditingBank(null)
            fetchBanks()
        } catch (error) {
            toast({
                title: "Error",
                description: "Failed to update bank",
                variant: "destructive"
            })
        }
    }

    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure you want to delete this bank?')) return
        
        try {
            const res = await fetch(`/api/staff/bank/${id}`, {
                method: 'DELETE'
            })
            if (!res.ok) throw new Error('Failed to delete bank')
            
            toast({
                title: "Success",
                description: "Bank deleted successfully"
            })
            fetchBanks()
        } catch (error) {
            toast({
                title: "Error",
                description: "Failed to delete bank",
                variant: "destructive"
            })
        }
    }

    const searchStaff = async (term: string) => {
        if (!term.trim()) {
            setStaffList([])
            return
        }
        const res = await fetch(`/api/staff/search?q=${term}`)
        const data = await res.json()
        
        // Filter out already shared users and owner from search results
        const filteredStaff = data.filter((staff: any) => {
            const isOwner = selectedBank?.bankOwners.some(owner => owner.id === staff.id)
            const isShared = sharedStaff.some(shared => shared.id === staff.id)
            return !isOwner && !isShared
        })
        
        setStaffList(filteredStaff)
    }

    const fetchSharedStaff = async (bankId: string) => {
        const res = await fetch(`/api/staff/bank/${bankId}/shared`, {
            cache: 'no-store', 
            next: { revalidate: 0 } 
        })
        const data = await res.json()
        setSharedStaff(data)
    }

    const handleShare = async (staffId: string) => {
        try {
            const res = await fetch(`/api/staff/bank/${selectedBank?.id}/share`, {
                method: 'POST',
                body: JSON.stringify({ staffId })
            })
            if (!res.ok) throw new Error('Failed to share bank')
            
            toast({
                title: "Success",
                description: "Bank shared successfully"
            })
            fetchSharedStaff(selectedBank?.id!)
        } catch (error) {
            toast({
                title: "Error",
                description: "Failed to share bank",
                variant: "destructive"
            })
        }
    }

    const handleUnshare = async (staffId: string) => {
        try {
            const res = await fetch(`/api/staff/bank/${selectedBank?.id}/share`, {
                method: 'DELETE',
                body: JSON.stringify({ staffId })
            })
            if (!res.ok) throw new Error('Failed to remove access')
            
            toast({
                title: "Success",
                description: "Access removed successfully"
            })
            fetchSharedStaff(selectedBank?.id!)
        } catch (error) {
            toast({
                title: "Error",
                description: "Failed to remove access",
                variant: "destructive"
            })
        }
    }

    const handlePromoteToOwner = async (staffId: string) => {
        try {
            const res = await fetch(`/api/staff/bank/${selectedBank?.id}/owner`, {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Cache-Control': 'no-cache'
                },
                body: JSON.stringify({ staffId })
            })
            
            if (!res.ok) throw new Error('Failed to promote to owner')
            
            // Get the staff member being promoted
            const promotedStaff = sharedStaff.find(staff => staff.id === staffId)
            
            // Update banks list
            setBanks(prevBanks => 
                prevBanks.map(bank => 
                    bank.id === selectedBank?.id 
                        ? {
                            ...bank,
                            bankOwners: [...bank.bankOwners, promotedStaff].filter(owner => owner !== undefined)
                        }
                        : bank
                )
            )

            // Update selected bank's owners
            setSelectedBank(prev => prev ? {
                ...prev,
                bankOwners: [...(prev.bankOwners || []), promotedStaff]
            } : null)
            
            // Remove from shared staff list
            setSharedStaff(prev => prev.filter(staff => staff.id !== staffId))
            
            toast({ title: "Success", description: "Staff promoted to owner" })
        } catch (error) {
            toast({
                title: "Error",
                description: "Failed to promote to owner",
                variant: "destructive"
            })
        }
    }

    const handleDemoteOwner = async (staffId: string, staffName: string) => {
        setConfirmDialog({
            isOpen: true,
            title: "Demote Owner",
            description: `Are you sure you want to demote ${staffName} from owner to staff member?`,
            action: async () => {
                try {
                    const res = await fetch(`/api/staff/bank/${selectedBank?.id}/owner`, {
                        method: 'DELETE',
                        headers: { 
                            'Content-Type': 'application/json',
                            'Cache-Control': 'no-cache'
                        },
                        body: JSON.stringify({ staffId })
                    })
                    
                    if (!res.ok) {
                        const error = await res.json()
                        throw new Error(error.message)
                    }
                    
                    // Get the owner being demoted
                    const demotedOwner = selectedBank?.bankOwners.find(owner => owner.id === staffId)
                    
                    // Update banks list
                    setBanks(prevBanks => 
                        prevBanks.map(bank => 
                            bank.id === selectedBank?.id 
                                ? {
                                    ...bank,
                                    bankOwners: bank.bankOwners.filter(owner => owner.id !== staffId)
                                }
                                : bank
                        )
                    )

                    // Update selected bank's owners
                    setSelectedBank(prev => prev ? {
                        ...prev,
                        bankOwners: prev.bankOwners.filter(owner => owner.id !== staffId)
                    } : null)
                    
                    // Add to shared staff list
                    if (demotedOwner) {
                        setSharedStaff(prev => [...prev, demotedOwner])
                    }
                    
                    toast({ title: "Success", description: "Owner demoted to staff" })
                } catch (error) {
                    toast({
                        title: "Error",
                        description: error instanceof Error ? error.message : "Failed to demote owner",
                        variant: "destructive"
                    })
                }
            }
        });
    }

    return (
        <div className="container mx-auto py-10 space-y-8">
            <div className="flex justify-between items-center">
                <h1 className="text-3xl font-bold">Question Banks</h1>
                <Dialog open={open} onOpenChange={setOpen}>
                    <DialogTrigger asChild>
                        <Button className="gap-2">
                            <Plus className="h-4 w-4" />
                            Create Bank
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[525px]">
                        <DialogHeader>
                            <DialogTitle>Create Question Bank</DialogTitle>
                        </DialogHeader>
                        <form onSubmit={handleCreate} className="space-y-6">
                            <div className="space-y-4">
                                <div className="grid w-full gap-1.5">
                                    <Label htmlFor="name">Name</Label>
                                    <Input
                                        id="name"
                                        name="name"
                                        placeholder="Enter bank name"
                                        required
                                    />
                                </div>

                                <div className="grid w-full gap-1.5">
                                    <Label htmlFor="semester">Semester</Label>
                                    <Select name="semester" required>
                                        <SelectTrigger className="w-full">
                                            <SelectValue placeholder="Select semester" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {Array.from({ length: 8 }, (_, i) => (
                                                <SelectItem key={i + 1} value={(i + 1).toString()}>
                                                    Semester {i + 1}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="grid w-full gap-1.5">
                                    <Label htmlFor="description">Description</Label>
                                    <Textarea
                                        id="description"
                                        name="description"
                                        placeholder="Enter bank description"
                                        className="min-h-[100px]"
                                    />
                                    <p className="text-sm text-muted-foreground">
                                        Briefly describe the purpose of this question bank
                                    </p>
                                </div>
                            </div>

                            <div className="flex justify-end gap-3">
                                <Button 
                                    type="button" 
                                    variant="outline"
                                    onClick={() => setOpen(false)}
                                >
                                    Cancel
                                </Button>
                                <Button type="submit">
                                    Create Bank
                                </Button>
                            </div>
                        </form>
                    </DialogContent>
                </Dialog>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="flex gap-2">
                    <Search className="h-4 w-4 mt-3" />
                    <Input
                        placeholder="Search banks..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
                <Select value={filterSemester} onValueChange={setFilterSemester}>
                    <SelectTrigger>
                        <SelectValue placeholder="Filter by semester" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Semesters</SelectItem>
                        {Array.from({ length: 8 }, (_, i) => (
                            <SelectItem key={i + 1} value={(i + 1).toString()}>
                                Semester {i + 1}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
                <div className="flex gap-2">
                    <Select value={sortBy} onValueChange={setSortBy}>
                        <SelectTrigger>
                            <SelectValue placeholder="Sort by" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="name">Name A-Z</SelectItem>
                            <SelectItem value="name_desc">Name Z-A</SelectItem>
                            <SelectItem value="createdAt">Newest First</SelectItem>
                            <SelectItem value="createdAt_asc">Oldest First</SelectItem>
                            <SelectItem value="semester_asc">Semester (Low to High)</SelectItem>
                            <SelectItem value="semester_desc">Semester (High to Low)</SelectItem>
                        </SelectContent>
                    </Select>
                    <Button
                        variant="outline"
                        size="icon"
                        onClick={() => setViewMode(viewMode === 'grid' ? 'table' : 'grid')}
                        className="flex-shrink-0"
                    >
                        {viewMode === 'grid' ? (
                            <TableIcon className="h-4 w-4" />
                        ) : (
                            <LayoutGrid className="h-4 w-4" />
                        )}
                    </Button>
                </div>
            </div>

            {viewMode === 'grid' ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {Array.isArray(banks) && banks.length > 0 ? (
                        banks.map((bank) => (
                            <Card key={bank.id}>
                                <CardHeader>
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <CardTitle>{bank.name}</CardTitle>
                                            <CardDescription>
                                                Owner{bank.bankOwners.length > 1 ? 's' : ''}: {bank.bankOwners.map(owner => owner.user.name).join(', ')}
                                            </CardDescription>
                                        </div>
                                        {bank.isOwner && (
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="ghost" size="sm">
                                                        <ChevronDown className="h-4 w-4" />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end">
                                                    <DropdownMenuItem onClick={() => setEditingBank(bank)}>
                                                        Edit
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem onClick={() => {
                                                        setSelectedBank(bank)
                                                        setShareOpen(true)
                                                        fetchSharedStaff(bank.id)
                                                    }}>
                                                        Share
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem 
                                                        onClick={() => handleDelete(bank.id)}
                                                        className="text-destructive"
                                                    >
                                                        Delete
                                                    </DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        )}
                                    </div>
                                </CardHeader>
                                <CardContent>
                                    <p className="text-sm text-muted-foreground mb-4">
                                        {bank.description || 'No description'}
                                    </p>
                                    <div className="flex items-center justify-between">
                                        <div className="text-sm">
                                            Semester {bank.semester}
                                        </div>
                                        <div className="space-x-2">
                                            <Button variant="outline" size="sm" 
                                                onClick={() => router.push(`/staff/bank/${bank.id}`)}>
                                                View
                                            </Button>
                                            {bank.isOwner && (
                                                <>
                                                    <Button variant="outline" size="sm"
                                                        onClick={() => {
                                                            setSelectedBank(bank)
                                                            setShareOpen(true)
                                                            fetchSharedStaff(bank.id)
                                                        }}>
                                                        Share
                                                    </Button>
                                                    {/* <Button variant="outline" size="sm"
                                                        onClick={() => handleDelete(bank.id)}
                                                        variant="destructive">
                                                        Delete
                                                    </Button> */}
                                                
                                                </>
                                            )}
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        ))
                    ) : (
                        <div className="col-span-full flex items-center justify-center p-8 text-muted-foreground">
                            No question banks found. Create one to get started.
                        </div>
                    )}
                </div>
            ) : (
                <div className="rounded-md border">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Name</TableHead>
                                <TableHead>Semester</TableHead>
                                <TableHead>Owner(s)</TableHead>
                                <TableHead>Description</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {Array.isArray(banks) && banks.length > 0 ? (
                                banks.map((bank) => (
                                    <TableRow key={bank.id}>
                                        <TableCell className="font-medium">{bank.name}</TableCell>
                                        <TableCell>Semester {bank.semester}</TableCell>
                                        <TableCell>{bank.bankOwners.map(owner => owner.user.name).join(', ')}</TableCell>
                                        <TableCell className="max-w-[200px] truncate">
                                            {bank.description || 'No description'}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex justify-end gap-2">
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => router.push(`/staff/bank/${bank.id}`)}
                                                >
                                                    View
                                                </Button>
                                                {bank.isOwner && (
                                                    <>
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            onClick={() => {
                                                                setSelectedBank(bank)
                                                                setShareOpen(true)
                                                                fetchSharedStaff(bank.id)
                                                            }}
                                                        >
                                                            Share
                                                        </Button>
                                                        <DropdownMenu>
                                                            <DropdownMenuTrigger asChild>
                                                                <Button variant="ghost" size="sm">
                                                                    <ChevronDown className="h-4 w-4" />
                                                                </Button>
                                                            </DropdownMenuTrigger>
                                                            <DropdownMenuContent align="end">
                                                                <DropdownMenuItem onClick={() => setEditingBank(bank)}>
                                                                    Edit
                                                                </DropdownMenuItem>
                                                                <DropdownMenuItem
                                                                    onClick={() => handleDelete(bank.id)}
                                                                    className="text-destructive"
                                                                >
                                                                    Delete
                                                                </DropdownMenuItem>
                                                            </DropdownMenuContent>
                                                        </DropdownMenu>
                                                    </>
                                                )}
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow>
                                    <TableCell colSpan={5} className="text-center text-muted-foreground">
                                        No question banks found. Create one to get started.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </div>
            )}

            {/* Show share dialog only for owners */}
            {selectedBank?.isOwner && (
                <Dialog open={shareOpen} onOpenChange={setShareOpen}>
                    <DialogContent className="sm:max-w-[600px]">
                        <DialogHeader>
                            <DialogTitle>Manage Access - {selectedBank?.name}</DialogTitle>
                        </DialogHeader>
                        <Tabs defaultValue="owners" className="w-full">
                            <TabsList className="grid w-full grid-cols-2">
                                <TabsTrigger value="owners">
                                    Owners ({selectedBank.bankOwners.length})
                                </TabsTrigger>
                                <TabsTrigger value="shared">
                                    Shared Staff ({sharedStaff.filter(staff => 
                                        !selectedBank.bankOwners.some(owner => owner.id === staff.id)
                                    ).length})
                                </TabsTrigger>
                            </TabsList>
                            <TabsContent value="owners" className="space-y-4">
                                <ScrollArea className="h-[300px] rounded-md border">
                                    <div className="p-4 space-y-2">
                                        {selectedBank.bankOwners.map((owner) => (
                                            <div key={owner.id} 
                                                className="flex items-center justify-between p-3 hover:bg-muted/50 rounded-md group">
                                                <div className="flex items-center gap-3">
                                                    <div>
                                                        <p className="font-medium">{owner.user.name}</p>
                                                        <p className="text-xs text-muted-foreground">{owner.user.email}</p>
                                                    </div>
                                                </div>
                                                {selectedBank.bankOwners.length > 1 && owner.user.email !== session?.user?.email && (
                                                    <Button 
                                                        variant="ghost" 
                                                        size="sm"
                                                        onClick={() => handleDemoteOwner(owner.id, owner.user.name)}
                                                        className="opacity-0 group-hover:opacity-100 transition-opacity"
                                                    >
                                                        Demote to Staff
                                                    </Button>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </ScrollArea>
                            </TabsContent>
                            <TabsContent value="shared" className="space-y-4">
                                <div className="flex items-center space-x-2 bg-muted/30 rounded-md px-3 py-2">
                                    <Search className="h-4 w-4 text-muted-foreground shrink-0" />
                                    <Input 
                                        placeholder="Search staff members..." 
                                        value={searchTerm}
                                        onChange={(e) => {
                                            setSearchTerm(e.target.value)
                                            searchStaff(e.target.value)
                                        }}
                                        className="border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0"
                                    />
                                </div>

                                <ScrollArea className="h-[300px] rounded-md border">
                                    <div className="p-4 space-y-2">
                                        {staffList.length > 0 && (
                                            <div className="mb-4">
                                                <h4 className="text-sm font-medium mb-2">Search Results</h4>
                                                {staffList.map((staff: any) => (
                                                    <div key={staff.id} 
                                                        className="flex items-center justify-between p-3 hover:bg-muted/50 rounded-md">
                                                        <div>
                                                            <p className="font-medium">{staff.user.name}</p>
                                                            <p className="text-xs text-muted-foreground">{staff.user.email}</p>
                                                        </div>
                                                        <Button 
                                                            variant="secondary" 
                                                            size="sm"
                                                            onClick={() => {
                                                                handleShare(staff.id)
                                                                setSearchTerm('')
                                                                setStaffList([])
                                                            }}
                                                        >
                                                            Add
                                                        </Button>
                                                    </div>
                                                ))}
                                            </div>
                                        )}

                                        <div>
                                            <h4 className="text-sm font-medium mb-2">Shared With</h4>
                                            {sharedStaff.filter(staff => 
                                                !selectedBank.bankOwners.some(owner => owner.id === staff.id)
                                            ).map((staff) => (
                                                <div key={staff.id} 
                                                    className="flex items-center justify-between p-3 hover:bg-muted/50 rounded-md group">
                                                    <div>
                                                        <p className="font-medium">{staff.user.name}</p>
                                                        <p className="text-xs text-muted-foreground">{staff.user.email}</p>
                                                    </div>
                                                    <div className="space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <Button 
                                                            variant="outline" 
                                                            size="sm"
                                                            onClick={() => handlePromoteToOwner(staff.id)}
                                                        >
                                                            Make Owner
                                                        </Button>
                                                        <Button 
                                                            variant="ghost" 
                                                            size="sm"
                                                            onClick={() => handleUnshare(staff.id)}
                                                        >
                                                            Remove
                                                        </Button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </ScrollArea>
                            </TabsContent>
                        </Tabs>
                    </DialogContent>
                </Dialog>
            )}

            {/* Confirmation Dialog */}
            <AlertDialog 
                open={confirmDialog.isOpen} 
                onOpenChange={(open) => !open && setConfirmDialog(prev => ({ ...prev, isOpen: false }))}
            >
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>{confirmDialog.title}</AlertDialogTitle>
                        <AlertDialogDescription>{confirmDialog.description}</AlertDialogDescription>
                    </AlertDialogHeader>
                    <div className="flex justify-end gap-3">
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={async () => {
                                await confirmDialog.action();
                                setConfirmDialog(prev => ({ ...prev, isOpen: false }));
                            }}
                        >
                            Confirm
                        </AlertDialogAction>
                    </div>
                </AlertDialogContent>
            </AlertDialog>

            {/* Edit Bank Dialog */}
            <Dialog open={!!editingBank} onOpenChange={(open) => !open && setEditingBank(null)}>
                <DialogContent className="sm:max-w-[525px]">
                    <DialogHeader>
                        <DialogTitle>Edit Bank</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleEdit} className="space-y-6">
                        <div className="space-y-4">
                            <div className="grid w-full gap-1.5">
                                <Label htmlFor="name">Name</Label>
                                <Input
                                    id="name"
                                    name="name"
                                    defaultValue={editingBank?.name}
                                    required
                                />
                            </div>

                            <div className="grid w-full gap-1.5">
                                <Label htmlFor="semester">Semester</Label>
                                <Select name="semester" defaultValue={editingBank?.semester} required>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select semester" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {Array.from({ length: 8 }, (_, i) => (
                                            <SelectItem key={i + 1} value={(i + 1).toString()}>
                                                Semester {i + 1}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="grid w-full gap-1.5">
                                <Label htmlFor="description">Description</Label>
                                <Textarea
                                    id="description"
                                    name="description"
                                    defaultValue={editingBank?.description || ''}
                                    className="min-h-[100px]"
                                />
                            </div>
                        </div>

                        <div className="flex justify-end gap-3">
                            <Button 
                                type="button" 
                                variant="outline"
                                onClick={() => setEditingBank(null)}
                            >
                                Cancel
                            </Button>
                            <Button type="submit">
                                Save Changes
                            </Button>
                        </div>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    )
}

// Add loading and auth protection
function BankPageWrapper() {
    const { status } = useSession()

    if (status === "loading") {
        return <div>Loading...</div>
    }

    if (status === "unauthenticated") {
        return <div>Access Denied</div>
    }

    return <BankPage />
}

export default BankPageWrapper