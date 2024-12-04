'use client';
import { useState, useEffect, use } from 'react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/hooks/use-toast';
import {
    Loader2,
    Download,
    FolderClosed as LucideFileIcon,
    File as LucideFile,
    FileText as LucideFileText,
    FileCode,
    Eye,
} from "lucide-react";
import { formatBytes } from '@/lib/utils';
import { Card, CardContent } from "@/components/ui/card";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import {
    ContextMenu,
    ContextMenuContent,
    ContextMenuItem,
    ContextMenuTrigger,
} from "@/components/ui/context-menu";


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
    const [resolvedParams, setResolvedParams] = useState<{ courseId: string } | null>(null);

    const [course, setCourse] = useState<Course | null>(null);
    const [courseId, setCourseId] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const { toast } = useToast();
    const [files, setFiles] = useState<FileInfo[]>([]);
    const [previewFile, setPreviewFile] = useState<FileInfo | null>(null);
    const [isPreviewOpen, setIsPreviewOpen] = useState(false);
    const [currentPath, setCurrentPath] = useState('');

    useEffect(() => {
        async function resolveParams() {
            const resolved = await params; // Await params
            setResolvedParams(resolved);
        }
        resolveParams();
    }, [params]);

    useEffect(() => {
        if (resolvedParams) {
            setCourseId(resolvedParams.courseId);
        }
    }, [resolvedParams]);

    useEffect(() => {
        if (!courseId) return;

        const fetchCourseDetails = async () => {
            try {
                setIsLoading(true);
                const response = await fetch(`/api/student/courses/course`, {
                    method: 'POST', // Changed to POST
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ courseId }), // Ensure courseId is sent in the body
                });
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
            } catch (err) {
                setError(err instanceof Error ? err.message : 'Failed to load course');
                console.error('Fetch error:', err);
            } finally {
                setIsLoading(false);
            }
        };

        const fetchFiles = async () => {
            try {
                const response = await fetch(`/api/student/sharepoint/${courseId}`, {
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
            } catch (error) {
                console.error('Error fetching files:', error);
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

    if (!resolvedParams) {
        // Show a loading state while resolving params
        return <div>Loading...</div>;
    }


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
        const previewUrl = file.previewUrl ? encodeURI(file.previewUrl) : '';

        switch (fileType) {
            case 'image':
                return (
                    <img
                        src={previewUrl}
                        alt={file.name}
                        className="max-w-full max-h-[80vh] object-contain"
                    />
                );
            case 'pdf':
                return (
                    <iframe
                        src={`${previewUrl}#view=FitH`}
                        className="w-full h-[80vh]"
                        title={file.name}
                    />
                );
            case 'notebook':
                return (
                    <iframe
                        src={`https://nbviewer.org/urls/${previewUrl}`}
                        className="w-full h-[80vh]"
                        title={file.name}
                    />
                );
            case 'doc':
            case 'excel':
                return (
                    <iframe
                        src={`https://view.officeapps.live.com/op/embed.aspx?src=${previewUrl}`}
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
        if (fileType === 'other') {
            // Direct download for non-previewable files
            if (file.url) {
                const link = document.createElement('a');
                link.href = file.url;
                link.download = file.name.split('/').pop() || file.name;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
            }
        } else {
            setPreviewFile(file);
            setIsPreviewOpen(true);
        }
    };

    const handleDownloadFolder = async (folderPath: string) => {
        try {
            const formData = new FormData();
            formData.append('folderPath', folderPath);

            const response = await fetch(`/api/student/sharepoint/${courseId}`, {
                method: 'POST',
                body: formData,
            });

            if (!response.ok) throw new Error('Download failed');

            // Get the filename from the content-disposition header if available
            const contentDisposition = response.headers.get('content-disposition');
            const fileName = contentDisposition
                ? contentDisposition.split('filename=')[1].replace(/"/g, '')
                : `${folderPath.split('/').pop()}.zip`;

            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = fileName;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(url);
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
                    {file.url}
                    <ContextMenuItem
                        onClick={() => {
                            if (file.url) {
                                const a = document.createElement('a');
                                a.href = file.url
                                a.download = file.name.split('/').pop() || file.name;
                                document.body.appendChild(a);
                                a.click();
                                document.body.removeChild(a);
                            }
                        }}
                    >
                        <Download className="mr-2 h-4 w-4" />
                        Download
                    </ContextMenuItem>
                </>
            )}
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



    return (
        <div className="container mx-auto p-6">
            <h1 className="text-2xl font-bold mb-4">{course?.name} SharePoint</h1>

            {renderFiles()}


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