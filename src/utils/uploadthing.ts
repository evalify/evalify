import { UploadDropzone as BaseUploadDropzone } from "@uploadthing/react";
import { FC } from "react";

interface CustomUploadDropzoneProps {
  endpoint: {
    url: string;
    formDataKey?: string;
    formData?: Record<string, string>;
  };
  onUploadBegin?: () => void;
  onClientUploadComplete?: (res: any[]) => void;
  onUploadError?: (error: Error) => void;
  config?: {
    mode?: "auto" | "manual";
    maxFileSize?: string;
    appendOnPaste?: boolean;
  };
}

export const UploadDropzone: FC<CustomUploadDropzoneProps> = ({
  endpoint,
  onUploadBegin,
  onClientUploadComplete,
  onUploadError,
  config
}) => {
  const customUploadHandler = async (file: File) => {
    try {
      onUploadBegin?.();
      const formData = new FormData();
      formData.append(endpoint.formDataKey || "file", file);
      
      if (endpoint.formData) {
        Object.entries(endpoint.formData).forEach(([key, value]) => {
          formData.append(key, value);
        });
      }

      const response = await fetch(endpoint.url, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error("Upload failed");
      }

      const data = await response.json();
      onClientUploadComplete?.([{ ...data, name: file.name }]);
      return data;
    } catch (error) {
      onUploadError?.(error as Error);
      throw error;
    }
  };

  return (
    <BaseUploadDropzone
      endpoint={["any"]}
      config={{
        mode: config?.mode || "auto",
        maxFileSize: config?.maxFileSize || "4MB",
      }}
      content={{
        label: "Drop your file here or click to browse",
        allowedContent: "Files up to 4MB",
      }}
      className="bg-muted/20 border-2 border-dashed border-muted-foreground/20 hover:border-muted-foreground/40 transition-colors"
      appearOnMount
      onUploadBegin={onUploadBegin}
      onClientUploadComplete={onClientUploadComplete}
      onUploadError={onUploadError}
      customUploadHandler={customUploadHandler}
    />
  );
};
