"use client";

import { useState, useCallback } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { useToast } from "@/hooks/use-toast";
import { useAnalytics } from "@/hooks/use-analytics";
import { getCroppedImg, fileToBase64, validateImageFile } from "@/lib/image-utils";
import Cropper from "react-easy-crop";
import { Upload, ZoomIn, RotateCw, Loader2 } from "lucide-react";

interface ImageUploadCropModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onImageCropped: (croppedImage: Blob) => Promise<void>;
}

export function ImageUploadCropModal({
    open,
    onOpenChange,
    onImageCropped,
}: ImageUploadCropModalProps) {
    const { error } = useToast();
    const { track } = useAnalytics();
    const [imageSrc, setImageSrc] = useState<string | null>(null);
    const [crop, setCrop] = useState({ x: 0, y: 0 });
    const [zoom, setZoom] = useState(1);
    const [rotation, setRotation] = useState(0);
    const [croppedAreaPixels, setCroppedAreaPixels] = useState<{
        x: number;
        y: number;
        width: number;
        height: number;
    } | null>(null);
    const [isUploading, setIsUploading] = useState(false);

    const onCropComplete = useCallback(
        (
            _croppedArea: unknown,
            croppedAreaPixels: { x: number; y: number; width: number; height: number }
        ) => {
            setCroppedAreaPixels(croppedAreaPixels);
        },
        []
    );

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            const file = e.target.files[0];

            // Validate file
            const validation = validateImageFile(file);
            if (!validation.valid) {
                error("Invalid Image", {
                    description: validation.error,
                });
                return;
            }

            try {
                const imageDataUrl = await fileToBase64(file);
                setImageSrc(imageDataUrl);
                track("profile_image_selected", {
                    fileSize: file.size,
                    fileType: file.type,
                });
            } catch (_err) {
                error("Error", {
                    description: "Failed to load image. Please try again.",
                });
            }
        }
    };

    const handleCropAndUpload = async () => {
        if (!imageSrc || !croppedAreaPixels) return;

        setIsUploading(true);
        try {
            const croppedImage = await getCroppedImg(imageSrc, croppedAreaPixels, rotation);

            if (!croppedImage) {
                throw new Error("Failed to crop image");
            }

            await onImageCropped(croppedImage);

            track("profile_image_cropped", {
                zoom,
                rotation,
            });

            // Reset state
            setImageSrc(null);
            setCrop({ x: 0, y: 0 });
            setZoom(1);
            setRotation(0);
            setCroppedAreaPixels(null);
            onOpenChange(false);
        } catch (err) {
            console.error("Error cropping image:", err);
            error("Upload Failed", {
                description: "Failed to crop and upload image. Please try again.",
            });
        } finally {
            setIsUploading(false);
        }
    };

    const handleCancel = () => {
        setImageSrc(null);
        setCrop({ x: 0, y: 0 });
        setZoom(1);
        setRotation(0);
        setCroppedAreaPixels(null);
        onOpenChange(false);
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[600px]">
                <DialogHeader>
                    <DialogTitle>Upload Profile Picture</DialogTitle>
                </DialogHeader>

                <div className="space-y-4">
                    {!imageSrc ? (
                        <div className="flex flex-col items-center justify-center border-2 border-dashed rounded-lg p-12 hover:border-primary/50 transition-colors">
                            <Upload className="h-12 w-12 text-muted-foreground mb-4" />
                            <h3 className="text-lg font-semibold mb-2">Choose an image</h3>
                            <p className="text-sm text-muted-foreground mb-4 text-center">
                                Upload a profile picture (JPEG, PNG, WebP)
                                <br />
                                Maximum size: 5MB
                            </p>
                            <label htmlFor="image-upload">
                                <Button variant="outline" asChild>
                                    <span className="cursor-pointer">Select Image</span>
                                </Button>
                            </label>
                            <input
                                id="image-upload"
                                type="file"
                                accept="image/jpeg,image/png,image/jpg,image/webp"
                                onChange={handleFileChange}
                                className="hidden"
                            />
                        </div>
                    ) : (
                        <>
                            {/* Crop Area */}
                            <div className="relative h-[400px] bg-slate-100 dark:bg-slate-900 rounded-lg overflow-hidden">
                                <Cropper
                                    image={imageSrc}
                                    crop={crop}
                                    zoom={zoom}
                                    rotation={rotation}
                                    aspect={1}
                                    onCropChange={setCrop}
                                    onCropComplete={onCropComplete}
                                    onZoomChange={setZoom}
                                    cropShape="round"
                                    showGrid={false}
                                />
                            </div>

                            {/* Controls */}
                            <div className="space-y-4">
                                {/* Zoom Control */}
                                <div className="space-y-2">
                                    <div className="flex items-center justify-between">
                                        <label className="text-sm font-medium flex items-center gap-2">
                                            <ZoomIn className="h-4 w-4" />
                                            Zoom
                                        </label>
                                        <span className="text-sm text-muted-foreground">
                                            {Math.round(zoom * 100)}%
                                        </span>
                                    </div>
                                    <Slider
                                        value={[zoom]}
                                        onValueChange={(value) => setZoom(value[0])}
                                        min={1}
                                        max={3}
                                        step={0.1}
                                        className="w-full"
                                    />
                                </div>

                                {/* Rotation Control */}
                                <div className="space-y-2">
                                    <div className="flex items-center justify-between">
                                        <label className="text-sm font-medium flex items-center gap-2">
                                            <RotateCw className="h-4 w-4" />
                                            Rotation
                                        </label>
                                        <span className="text-sm text-muted-foreground">
                                            {rotation}°
                                        </span>
                                    </div>
                                    <Slider
                                        value={[rotation]}
                                        onValueChange={(value) => setRotation(value[0])}
                                        min={0}
                                        max={360}
                                        step={1}
                                        className="w-full"
                                    />
                                </div>
                            </div>

                            {/* Action Buttons */}
                            <div className="flex justify-between gap-3 pt-4">
                                <Button
                                    variant="outline"
                                    onClick={() => {
                                        setImageSrc(null);
                                        setCrop({ x: 0, y: 0 });
                                        setZoom(1);
                                        setRotation(0);
                                    }}
                                    disabled={isUploading}
                                >
                                    Choose Different Image
                                </Button>
                                <div className="flex gap-3">
                                    <Button
                                        variant="outline"
                                        onClick={handleCancel}
                                        disabled={isUploading}
                                    >
                                        Cancel
                                    </Button>
                                    <Button onClick={handleCropAndUpload} disabled={isUploading}>
                                        {isUploading ? (
                                            <>
                                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                Uploading...
                                            </>
                                        ) : (
                                            "Crop & Upload"
                                        )}
                                    </Button>
                                </div>
                            </div>
                        </>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}
