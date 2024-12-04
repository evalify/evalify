'use client';
import { useState, useEffect, use } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/hooks/use-toast';
import {
    Loader2,
    Download,
    FolderClosed as LucideFileIcon,
    File as LucideFile,
    FileText as LucideFileText,
    FileCode,
    Eye,
    Trash2,
} from "lucide-react";
import { formatBytes } from '@/lib/utils';
import { Card, CardContent } from "@/components/ui/card";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import {
    ContextMenu,
    ContextMenuContent,
    ContextMenuItem,
    ContextMenuTrigger,
} from "@/components/ui/context-menu";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";

interface Props {
    params: Promise<{ courseId: string }>;
}

interface Course {
    id: string;
    name: string;
    code: string;
    sharePoint: string | null;
    class: {
        id: string;
        name: string;
        sharePoint: string | null;
    };
}

interface FileInfo {
    name: string;
    size: number;
    lastModified: Date;
    url?: string;
    contentType?: string;
    previewUrl?: string;
    isFolder: boolean;
}

export default function CourseSharePoint({ params }: Props) {
    const resolvedParams = use(params);
    const courseId = resolvedParams.courseId;
    const [course, setCourse] = useState<Course | null>(null);
    const [sharePointUrl, setSharePointUrl] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const { toast } = useToast();
    const [files, setFiles] = useState<FileInfo[]>([]);
    const [uploading, setUploading] = useState(false);
    const [uploadingFile, setUploadingFile] = useState<string>("");
    const [previewFile, setPreviewFile] = useState<FileInfo | null>(null);
    const [isPreviewOpen, setIsPreviewOpen] = useState(false);
    const [fileToDelete, setFileToDelete] = useState<FileInfo | null>(null);
    const [currentPath, setCurrentPath] = useState('');
    const [showNewFolderDialog, setShowNewFolderDialog] = useState(false);
    const [newFolderName, setNewFolderName] = useState('');
    const [movingFile, setMovingFile] = useState<FileInfo | null>(null);
    const [targetFolder, setTargetFolder] = useState('');
    const [availableFolders, setAvailableFolders] = useState<string[]>([]);

    useEffect(() => {
        const fetchCourseDetails = async () => {
            try {
                setIsLoading(true);
                const response = await fetch(`/api/staff/courses/${courseId}`);
                const contentType = response.headers.get("content-type");
                if (!contentType || !contentType.includes("application/json")) {
                    throw new Error("Server didn't return JSON");
                }

                const data = await response.json();
                if (!response.ok) {
                    throw new Error(data.error || 'Failed to fetch course details');
                }

                if (!data.course) {
                    throw new Error('No course data received');
                }

                setCourse(data.course);
                setSharePointUrl(data.course.sharePoint || data.course.class.sharePoint || '');
            } catch (err) {
                setError(err instanceof Error ? err.message : 'Failed to load course');
                console.log('Fetch error:', err);
            } finally {
                setIsLoading(false);
            }
        };

        const updateAvailableFolders = (files: FileInfo[]) => {
            const folders = new Set<string>();
            folders.add('/'); // Root folder with special value

            files.forEach(file => {
                if (file.isFolder) {
                    folders.add(file.name);
                } else {
                    const parts = file.name.split('/');
                    parts.pop();
                    if (parts.length > 0) {
                        folders.add(parts.join('/'));
                    }
                }
            });

            setAvailableFolders(Array.from(folders));
        };

        const fetchFiles = async () => {
            try {
                const response = await fetch(`/api/staff/sharepoint/${courseId}`, {
                    headers: {
                        'Cache-Control': 'no-cache',
                    },
                });

                if (!response.ok) {
                    throw new Error(response.statusText || 'Failed to fetch files');
                }

                const data = await response.json();
                const filesList = Array.isArray(data.files) ? data.files : [];
                setFiles(filesList);
                updateAvailableFolders(filesList);
            } catch (error) {
                console.log('Error fetching files:', error);
                setFiles([]);
                toast({
                    title: 'Error',
                    description: error instanceof Error ? error.message : 'Failed to load files',
                    variant: 'destructive',
                });
            }
        };

        fetchCourseDetails();
        fetchFiles();
    }, [courseId, toast]);

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

    const handleUpdateSharePoint = async () => {
        try {
            const response = await fetch(`/api/staff/sharepoint/${courseId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ sharePointUrl }),
            });

            if (!response.ok) throw new Error('Failed to update');

            toast({
                title: 'Success',
                description: 'SharePoint URL updated successfully',
            });
        } catch (error) {
            toast({
                title: 'Error',
                description: 'Failed to update SharePoint URL',
                variant: 'destructive',
            });
        }
    };

    const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        try {
            setUploadingFile(file.name);
            setUploading(true);
            const formData = new FormData();
            formData.append('file', file);

            const response = await fetch(`/api/staff/sharepoint/${courseId}`, {
                method: 'POST',
                body: formData,
            });

            if (!response.ok) throw new Error('Upload failed');

            toast({
                title: 'Success',
                description: 'File uploaded successfully',
            });

            // Refresh file list
            const filesResponse = await fetch(`/api/staff/sharepoint/${courseId}`);
            const data = await filesResponse.json();
            setFiles(data.files);
        } catch (error) {
            toast({
                title: 'Error',
                description: 'Failed to upload file',
                variant: 'destructive',
            });
        } finally {
            setUploading(false);
            setUploadingFile("");
        }
    };

    const handleDeleteFile = async (fileName: string) => {
        try {
            const response = await fetch(`/api/staff/sharepoint/${courseId}`, {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ fileName }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Delete failed');
            }

            toast({
                title: 'Success',
                description: 'File deleted successfully',
            });

            setFiles(files.filter(f => f.name !== fileName));
        } catch (error) {
            toast({
                title: 'Error',
                description: error instanceof Error ? error.message : 'Failed to delete file',
                variant: 'destructive',
            });
        }
    };

    const handleDeleteConfirm = async () => {
        if (!fileToDelete) return;
        await handleDeleteFile(fileToDelete.name);
        setFileToDelete(null);
    };

    const getFileIcon = (fileName: string) => {
        const ext = fileName.split('.').pop()?.toLowerCase();
        switch (ext) {
            case 'pdf': return <LucideFile className="h-12 w-12 text-red-500" />;
            case 'doc':
            case 'docx': return <LucideFileText className="h-12 w-12 text-blue-500" />;
            case 'xls':
            case 'xlsx': return <LucideFileText className="h-12 w-12 text-green-500" />;
            case 'ipynb': return <FileCode className="h-12 w-12 text-orange-500" />;
            default: return <LucideFile className="h-12 w-12 text-gray-500" />;
        }
    };

    const getFileType = (fileName: string) => {
        const ext = fileName.split('.').pop()?.toLowerCase();
        if (['jpg', 'jpeg', 'png', 'gif'].includes(ext || '')) return 'image';
        if (ext === 'pdf') return 'pdf';
        if (['doc', 'docx'].includes(ext || '')) return 'doc';
        if (['xls', 'xlsx'].includes(ext || '')) return 'excel';
        if (ext === 'ipynb') return 'notebook';
        return 'other';
    };

    const renderPreview = (file: FileInfo) => {
        const fileType = getFileType(file.name);

        switch (fileType) {
            case 'image':
                return (
                    <img
                        src={file.previewUrl}
                        alt={file.name}
                        className="max-w-full max-h-[80vh] object-contain"
                    />
                );
            case 'pdf':
                return (
                    <iframe
                        src={`${file.previewUrl}#view=FitH`}
                        className="w-full h-[80vh]"
                        title={file.name}
                    />
                );
            case 'notebook':
                return (
                    <iframe
                        src={`https://nbviewer.org/url/${encodeURIComponent(file.previewUrl || '')}`}
                        className="w-full h-[80vh]"
                        title={file.name}
                    />
                );
            case 'doc':
            case 'excel':
                return (
                    <iframe
                        src={`https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(file.previewUrl || '')}`}
                        className="w-full h-[80vh]"
                        title={file.name}
                    />
                );
            default:
                return <div>Preview not available for this file type</div>;
        }
    };

    const handlePreviewFile = (file: FileInfo) => {
        const fileType = getFileType(file.name);
        if (fileType !== 'other') {
            setPreviewFile(file);
            setIsPreviewOpen(true);
        } else if (file.url) {
            window.open(file.url, '_blank');
        }
    };

    const handleCreateFolder = async () => {
        try {
            const fullPath = currentPath ? `${currentPath}/${newFolderName}` : newFolderName;
            const response = await fetch(`/api/staff/sharepoint/${courseId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'createFolder',
                    folderName: fullPath
                }),
            });

            if (!response.ok) throw new Error('Failed to create folder');

            toast({
                title: 'Success',
                description: 'Folder created successfully',
            });

            // Refresh file list
            const filesResponse = await fetch(`/api/staff/sharepoint/${courseId}`);
            const data = await filesResponse.json();
            setFiles(data.files);
            setShowNewFolderDialog(false);
            setNewFolderName('');
        } catch (error) {
            toast({
                title: 'Error',
                description: 'Failed to create folder',
                variant: 'destructive',
            });
        }
    };

    const handleMoveFile = async (file: FileInfo, targetFolder: string) => {
        try {
            // Use empty string for root folder, otherwise use the target folder path
            const newPath = targetFolder === '/' ?
                file.name.split('/').pop() || '' :
                `${targetFolder}/${file.name.split('/').pop()}`;

            const response = await fetch(`/api/staff/sharepoint/${courseId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'moveFile',
                    oldPath: file.name,
                    newPath
                }),
            });

            if (!response.ok) throw new Error('Failed to move file');

            toast({
                title: 'Success',
                description: 'File moved successfully',
            });

            // Refresh file list
            const filesResponse = await fetch(`/api/staff/sharepoint/${courseId}`);
            const data = await filesResponse.json();
            setFiles(data.files);
            setMovingFile(null);
            setTargetFolder('');
        } catch (error) {
            toast({
                title: 'Error',
                description: 'Failed to move file',
                variant: 'destructive',
            });
        }
    };

    const handleDownloadFolder = async (folderPath: string) => {
        try {
            const formData = new FormData();
            formData.append('folderPath', folderPath);

            const response = await fetch(`/api/staff/sharepoint/${courseId}`, {
                method: 'POST',
                body: formData,
            });

            if (!response.ok) throw new Error('Download failed');

            // Create a blob from the response and trigger download
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${folderPath.split('/').pop()}.zip`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
        } catch (error) {
            toast({
                title: 'Error',
                description: 'Failed to download folder',
                variant: 'destructive',
            });
        }
    };

    const renderContextMenu = (file: FileInfo) => (
        <ContextMenuContent>
            {file.isFolder ? (
                <ContextMenuItem onClick={() => handleDownloadFolder(file.name)}>
                    <Download className="mr-2 h-4 w-4" />
                    Download Folder
                </ContextMenuItem>
            ) : (
                <>
                    <ContextMenuItem onClick={() => handlePreviewFile(file)}>
                        <Eye className="mr-2 h-4 w-4" />
                        Preview
                    </ContextMenuItem>
                    <ContextMenuItem onClick={() => file.url && window.open(file.url, '_blank')}>
                        <Download className="mr-2 h-4 w-4" />
                        Download
                    </ContextMenuItem>
                    <ContextMenuItem onClick={() => setMovingFile(file)}>
                        Move to folder
                    </ContextMenuItem>
                </>
            )}
            <ContextMenuItem
                onClick={() => setFileToDelete(file)}
                className="text-red-600"
            >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
            </ContextMenuItem>
        </ContextMenuContent>
    );

    const renderFiles = () => (
        <>
            {/* Breadcrumb Navigation */}
            <div className="flex items-center gap-2 mb-4">
                <Button
                    variant="ghost"
                    onClick={() => setCurrentPath('')}
                    disabled={!currentPath}
                >
                    Root
                </Button>
                {currentPath.split('/').map((folder, index, array) => (
                    <div key={index} className="flex items-center">
                        <span className="mx-2">/</span>
                        <Button
                            variant="ghost"
                            onClick={() => setCurrentPath(array.slice(0, index + 1).join('/'))}
                        >
                            {folder}
                        </Button>
                    </div>
                ))}
            </div>

            {/* File operations buttons */}
            <div className="flex gap-4 mb-4">
                <Button
                    variant="outline"
                    disabled={uploading}
                    onClick={() => document.getElementById('file-upload')?.click()}
                >
                    {uploadingFile ? (
                        <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Uploading {uploadingFile}...
                        </>
                    ) : (
                        'Upload File'
                    )}
                </Button>
                <Button
                    variant="outline"
                    onClick={() => setShowNewFolderDialog(true)}
                >
                    New Folder
                </Button>
                <Input
                    id="file-upload"
                    type="file"
                    onChange={handleFileUpload}
                    className="hidden"
                />
            </div>

            {/* Grid view of files and folders */}
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                {files
                    .filter(file => {
                        const filePath = file.name.split('/');
                        filePath.pop();
                        const fileDirectory = filePath.join('/');
                        return fileDirectory === currentPath;
                    })
                    .map((file) => (
                        <ContextMenu key={file.name}>
                            <ContextMenuTrigger>
                                <Card
                                    className="hover:shadow-lg transition-shadow cursor-pointer"
                                    onClick={() => file.isFolder ?
                                        setCurrentPath(file.name) :
                                        handlePreviewFile(file)}
                                >
                                    <CardContent className="p-4">
                                        <div className="flex flex-col items-center">
                                            {file.isFolder ? (
                                                <LucideFileIcon className="h-12 w-12 text-yellow-500" />
                                            ) : (
                                                getFileIcon(file.name)
                                            )}
                                            <p className="mt-2 text-sm font-medium text-center truncate w-full">
                                                {file.name.split('/').pop()}
                                            </p>
                                            {!file.isFolder ? (
                                                <p className="text-xs text-gray-500">
                                                    {formatBytes(file.size)}
                                                </p>
                                            ) : (
                                                <p className="text-xs text-gray-500">
                                                    Folder
                                                </p>
                                            )
                                            }
                                        </div>
                                    </CardContent>
                                </Card>
                            </ContextMenuTrigger>
                            {renderContextMenu(file)}
                        </ContextMenu>
                    ))}
            </div>
        </>
    );


    const renderMoveFileDialog = () => (
        <Dialog open={!!movingFile} onOpenChange={() => setMovingFile(null)}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Move File</DialogTitle>
                </DialogHeader>
                <Select
                    value={targetFolder}
                    onValueChange={setTargetFolder}
                >
                    <SelectTrigger>
                        <SelectValue placeholder="Select destination folder" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="/">Root Folder</SelectItem>
                        {availableFolders
                            .filter(folder => folder !== '') // Exclude root as it's already added
                            .map(folder => (
                                <SelectItem key={folder} value={folder}>
                                    {folder}
                                </SelectItem>
                            ))}
                    </SelectContent>
                </Select>
                <DialogFooter>
                    <Button
                        onClick={() => movingFile && handleMoveFile(movingFile, targetFolder)}
                    >
                        Move
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );

    return (
        <div className="container mx-auto p-6">
            <h1 className="text-2xl font-bold mb-4">{course?.name} SharePoint</h1>

            {renderFiles()}

            {/* Dialogs */}
            <Dialog open={showNewFolderDialog} onOpenChange={setShowNewFolderDialog}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Create New Folder</DialogTitle>
                    </DialogHeader>
                    <Input
                        value={newFolderName}
                        onChange={(e) => setNewFolderName(e.target.value)}
                        placeholder="Enter folder name"
                    />
                    <DialogFooter>
                        <Button onClick={handleCreateFolder}>Create</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {renderMoveFileDialog()}

            <AlertDialog open={!!fileToDelete} onOpenChange={() => setFileToDelete(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete File</AlertDialogTitle>
                        <AlertDialogDescription>
                            Are you sure you want to delete this file? This action cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDeleteConfirm}>
                            Delete
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>File Preview</DialogTitle>
                    </DialogHeader>
                    {previewFile && renderPreview(previewFile)}
                </DialogContent>
            </Dialog>
        </div>
    );
}