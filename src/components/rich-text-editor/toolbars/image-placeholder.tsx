// "use client";

// import { Button } from "@/components/ui/button";
// import { Input } from "@/components/ui/input";
// import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
// import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
// import { NODE_HANDLES_SELECTED_STYLE_CLASSNAME, cn, isValidUrl } from "@/lib/utils";
// import {
//     type CommandProps,
//     type Editor,
//     Node,
//     type NodeViewProps,
//     NodeViewWrapper,
//     ReactNodeViewRenderer,
//     mergeAttributes,
// } from "@tiptap/react";
// import { Image as LucideImage, Link, Upload } from "lucide-react";
// import { type FormEvent, useState } from "react";
// import { useMutation } from "@tanstack/react-query";
// import fileUploadQueries from "@/repo/file-upload-queries/file-upload-queries";
// import { useToast } from "@/hooks/use-toast";

// export interface ImagePlaceholderOptions {
//     HTMLAttributes: Record<string, unknown>;
//     onDrop: (files: File[], editor: Editor) => void;
//     onDropRejected?: (files: File[], editor: Editor) => void;
//     onEmbed: (url: string, editor: Editor) => void;
//     allowedMimeTypes?: Record<string, string[]>;
//     maxFiles?: number;
//     maxSize?: number;
// }

// declare module "@tiptap/core" {
//     interface Commands<ReturnType> {
//         imagePlaceholder: {
//             /**
//              * Inserts an image placeholder
//              */
//             insertImagePlaceholder: () => ReturnType;
//         };
//     }
// }

// export const ImagePlaceholder = Node.create<ImagePlaceholderOptions>({
//     name: "image-placeholder",

//     addOptions() {
//         return {
//             HTMLAttributes: {},
//             onDrop: () => {},
//             onDropRejected: () => {},
//             onEmbed: () => {},
//         };
//     },

//     group: "block",

//     parseHTML() {
//         return [{ tag: `div[data-type="${this.name}"]` }];
//     },

//     renderHTML({ HTMLAttributes }) {
//         return [
//             "div",
//             mergeAttributes(
//                 { "data-type": "image-placeholder" }, // ensure round-tripping
//                 HTMLAttributes
//             ),
//         ];
//     },

//     addNodeView() {
//         return ReactNodeViewRenderer(ImagePlaceholderComponent, {
//             className: NODE_HANDLES_SELECTED_STYLE_CLASSNAME,
//         });
//     },

//     addCommands() {
//         return {
//             insertImagePlaceholder: () => (props: CommandProps) => {
//                 return props.commands.insertContent({
//                     type: "image-placeholder",
//                 });
//             },
//         };
//     },
// });

// function ImagePlaceholderComponent(props: NodeViewProps) {
//     const { editor, extension, selected, deleteNode } = props;
//     const { error: showError } = useToast();

//     const [open, setOpen] = useState(false);
//     const [url, setUrl] = useState("");
//     const [urlError, setUrlError] = useState(false);
//     const [isDragActive, setIsDragActive] = useState(false);
//     const [isDragReject, setIsDragReject] = useState(false);
//     const [uploadProgress, setUploadProgress] = useState(0);

//     const uploadMutation = useMutation({
//         mutationFn: async (file: File) => {
//             return fileUploadQueries.uploadFile({ file }, (progress) =>
//                 setUploadProgress(progress)
//             );
//         },
//         onSuccess: (data) => {
//             const imageUrl = fileUploadQueries.constructMinioUrl(data.objectName);
//             // Use setTimeout to avoid flushSync warning by deferring the update
//             setTimeout(() => {
//                 editor.chain().focus().setImage({ src: imageUrl }).run();
//                 setOpen(false);
//                 setUploadProgress(0);
//                 deleteNode();
//             }, 0);
//         },
//         onError: (error) => {
//             showError("Upload Failed", {
//                 description: error instanceof Error ? error.message : "Failed to upload image",
//             });
//             setUploadProgress(0);
//             deleteNode();
//         },
//     });

//     const handleDragEnter = (e: React.DragEvent<HTMLDivElement>) => {
//         if (uploadMutation.isPending) return;
//         e.preventDefault();
//         e.stopPropagation();
//         setIsDragActive(true);
//     };

//     const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
//         if (uploadMutation.isPending) return;
//         e.preventDefault();
//         e.stopPropagation();
//         setIsDragActive(false);
//         setIsDragReject(false);
//     };

//     const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
//         if (uploadMutation.isPending) return;
//         e.preventDefault();
//         e.stopPropagation();
//     };

//     const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
//         if (uploadMutation.isPending) return;

//         e.preventDefault();
//         e.stopPropagation();
//         setIsDragActive(false);
//         setIsDragReject(false);

//         const { files } = e.dataTransfer;
//         const acceptedFiles: File[] = [];
//         const rejectedFiles: File[] = [];

//         Array.from(files).forEach((file) => {
//             if (
//                 extension.options.allowedMimeTypes &&
//                 !Object.keys(extension.options.allowedMimeTypes).some((type) =>
//                     file.type.match(type)
//                 )
//             ) {
//                 rejectedFiles.push(file);
//             } else if (extension.options.maxSize && file.size > extension.options.maxSize) {
//                 rejectedFiles.push(file);
//             } else {
//                 acceptedFiles.push(file);
//             }
//         });

//         if (rejectedFiles.length > 0) {
//             setIsDragReject(true);
//             extension.options.onDropRejected?.(rejectedFiles, editor);
//             showError("Invalid Files", {
//                 description: `${rejectedFiles.length} file(s) rejected due to size or type restrictions`,
//             });
//         }

//         if (acceptedFiles.length > 0) {
//             handleAcceptedFiles(acceptedFiles);
//         }
//     };

//     const handleAcceptedFiles = async (acceptedFiles: File[]) => {
//         if (acceptedFiles.length === 0) return;

//         const file = acceptedFiles[0];
//         uploadMutation.mutate(file);

//         if (extension.options.onDrop) {
//             extension.options.onDrop(acceptedFiles, editor);
//         }
//     };

//     const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
//         const files = Array.from(e.target.files || []);
//         handleAcceptedFiles(files);
//     };

//     const handleInsertEmbed = async (e: FormEvent) => {
//         e.preventDefault();
//         const valid = isValidUrl(url);
//         if (!valid) {
//             setUrlError(true);
//             return;
//         }

//         if (url !== "") {
//             try {
//                 setOpen(false);
//                 editor.chain().focus().setImage({ src: url }).run();
//                 extension.options.onEmbed(url, editor);
//                 deleteNode();
//             } catch (error) {
//                 showError("Error", {
//                     description: error instanceof Error ? error.message : "Failed to embed image",
//                 });
//                 deleteNode();
//             }
//         }
//     };

//     return (
//         <NodeViewWrapper className="w-full">
//             <Popover modal open={open}>
//                 <PopoverTrigger
//                     onClick={() => {
//                         setOpen(true);
//                     }}
//                     asChild
//                     className="w-full"
//                 >
//                     <div
//                         className={cn(
//                             "flex cursor-pointer items-center gap-3 rounded-md bg-accent p-2 py-3 text-sm text-accent-foreground transition-colors hover:bg-secondary",
//                             selected && "bg-primary/10 hover:bg-primary/20"
//                         )}
//                     >
//                         <LucideImage className="h-6 w-6" aria-hidden="true" />
//                         Add an image
//                     </div>
//                 </PopoverTrigger>
//                 <PopoverContent
//                     className="w-[450px] px-0 py-2"
//                     onPointerDownOutside={() => {
//                         setOpen(false);
//                     }}
//                     onEscapeKeyDown={() => {
//                         setOpen(false);
//                     }}
//                 >
//                     <Tabs defaultValue="upload" className="px-3">
//                         <TabsList>
//                             <TabsTrigger className="px-2 py-1 text-sm" value="upload">
//                                 <Upload className="mr-2 h-4 w-4" aria-hidden="true" />
//                                 Upload
//                             </TabsTrigger>
//                             <TabsTrigger className="px-2 py-1 text-sm" value="url">
//                                 <Link className="mr-2 h-4 w-4" aria-hidden="true" />
//                                 Embed link
//                             </TabsTrigger>
//                         </TabsList>

//                         <TabsContent value="upload">
//                             <div
//                                 onDragEnter={handleDragEnter}
//                                 onDragLeave={handleDragLeave}
//                                 onDragOver={handleDragOver}
//                                 onDrop={handleDrop}
//                                 className={cn(
//                                     "my-2 rounded-md border border-dashed text-sm transition-colors",
//                                     isDragActive &&
//                                         !uploadMutation.isPending &&
//                                         "border-primary bg-secondary",
//                                     isDragReject && "border-destructive bg-destructive/10",
//                                     uploadMutation.isPending &&
//                                         "border-primary bg-secondary opacity-50 cursor-not-allowed",
//                                     !uploadMutation.isPending && "hover:bg-secondary"
//                                 )}
//                             >
//                                 <input
//                                     type="file"
//                                     accept={Object.values(extension.options.allowedMimeTypes || {})
//                                         .flat()
//                                         .join(",")}
//                                     multiple={extension.options.maxFiles !== 1}
//                                     onChange={handleFileInputChange}
//                                     className="hidden"
//                                     id="file-input"
//                                     disabled={uploadMutation.isPending}
//                                 />
//                                 <label
//                                     htmlFor="file-input"
//                                     className={cn(
//                                         "flex h-28 w-full flex-col items-center justify-center text-center",
//                                         uploadMutation.isPending
//                                             ? "cursor-not-allowed"
//                                             : "cursor-pointer"
//                                     )}
//                                 >
//                                     {uploadMutation.isPending ? (
//                                         <>
//                                             <div className="mb-2 h-1 w-3/4 rounded-full bg-gray-200">
//                                                 <div
//                                                     className="h-1 rounded-full bg-primary transition-all"
//                                                     style={{ width: `${uploadProgress}%` }}
//                                                 />
//                                             </div>
//                                             <p>Uploading image...</p>
//                                         </>
//                                     ) : (
//                                         <>
//                                             <Upload
//                                                 className="mx-auto mb-2 h-6 w-6"
//                                                 aria-hidden="true"
//                                             />
//                                             Drag & drop or click to upload
//                                         </>
//                                     )}
//                                 </label>
//                             </div>
//                         </TabsContent>
//                         <TabsContent value="url">
//                             <form onSubmit={handleInsertEmbed}>
//                                 <Input
//                                     value={url}
//                                     onChange={(e) => {
//                                         setUrl(e.target.value);
//                                         if (urlError) {
//                                             setUrlError(false);
//                                         }
//                                     }}
//                                     placeholder="Paste the image link..."
//                                 />
//                                 {urlError && (
//                                     <p className="py-1.5 text-xs text-danger-11">
//                                         Please enter a valid URL
//                                     </p>
//                                 )}
//                                 <Button
//                                     type="submit"
//                                     size="sm"
//                                     className="my-2 h-8 w-full p-2 text-xs"
//                                     disabled={uploadMutation.isPending || !url}
//                                 >
//                                     Embed Image
//                                 </Button>
//                                 <p className="text-center text-xs text-gray-11">
//                                     Works with any image from the web
//                                 </p>
//                             </form>
//                         </TabsContent>
//                     </Tabs>
//                 </PopoverContent>
//             </Popover>
//         </NodeViewWrapper>
//     );
// }
