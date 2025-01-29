import { FC } from "react";
import { UploadDropzone as UTUploadDropzone } from "@uploadthing/react";
import { OurFileRouter } from "@/app/api/uploadthing/core";

interface CustomUploadDropzoneProps {
  onUploadBegin?: () => void;
  onClientUploadComplete?: (res: { url: string }[]) => void;
  onUploadError?: (error: Error) => void;
}

export const UploadDropzone: FC<CustomUploadDropzoneProps> = ({
  onUploadBegin,
  onClientUploadComplete,
  onUploadError,
}) => {
  return (
    <UTUploadDropzone<OurFileRouter>
      endpoint="quizFileUploader"
      config={{ mode: "auto" }}
      content={{
        label: "Drop files here or click to browse",
        allowedContent: "PDF, Text, or Image files up to 4MB"
      }}
      className="bg-muted/20 border-2 border-dashed border-muted-foreground/20 hover:border-muted-foreground/40 transition-colors"
      onUploadBegin={onUploadBegin}
      onClientUploadComplete={onClientUploadComplete}
      onUploadError={onUploadError}
    />
  );
};
