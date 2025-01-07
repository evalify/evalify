import { useState } from 'react';
import Cropper, { Area } from 'react-easy-crop';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from './dialog';
import { Button } from './button';

interface CropDialogProps {
  open: boolean;
  onClose: () => void;
  image: string;
  onCropComplete: (croppedImageUrl: string) => void;
}

export function CropDialog({ open, onClose, image, onCropComplete }: CropDialogProps) {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);

  const createCroppedImage = async () => {
    if (!croppedAreaPixels) return;

    const img = new Image();
    img.src = image;
    await img.decode();

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = croppedAreaPixels.width;
    canvas.height = croppedAreaPixels.height;

    ctx.drawImage(
      img,
      croppedAreaPixels.x,
      croppedAreaPixels.y,
      croppedAreaPixels.width,
      croppedAreaPixels.height,
      0,
      0,
      croppedAreaPixels.width,
      croppedAreaPixels.height
    );

    const croppedImageUrl = canvas.toDataURL('image/jpeg');
    onCropComplete(croppedImageUrl);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[720px]">
        <DialogHeader>
          <DialogTitle>Crop Image</DialogTitle>
        </DialogHeader>
        <div className="relative h-[400px] w-full">
          <Cropper
            image={image}
            crop={crop}
            zoom={zoom}
            aspect={16 / 9}
            onCropChange={setCrop}
            onZoomChange={setZoom}
            onCropComplete={(_, croppedPixels) => setCroppedAreaPixels(croppedPixels)}
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={createCroppedImage}>Apply</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
