import { toast as sonnerToast } from "sonner";

type ToastType = "success" | "error" | "warning" | "info";

interface ToastOptions {
    title?: string;
    description?: string;
    action?: {
        label: string;
        onClick: () => void;
    };
    duration?: number;
}

export function useToast() {
    const toast = (type: ToastType, message: string, options?: ToastOptions) => {
        const toastOptions = {
            description: options?.description,
            action: options?.action
                ? {
                      label: options.action.label,
                      onClick: options.action.onClick,
                  }
                : undefined,
            duration: options?.duration ?? 4000,
        };

        switch (type) {
            case "success":
                return sonnerToast.success(message, toastOptions);
            case "error":
                return sonnerToast.error(message, toastOptions);
            case "warning":
                return sonnerToast.warning(message, toastOptions);
            case "info":
                return sonnerToast.info(message, toastOptions);
            default:
                return sonnerToast(message, toastOptions);
        }
    };

    return {
        toast,
        success: (message: string, options?: ToastOptions) => toast("success", message, options),
        error: (message: string, options?: ToastOptions) => toast("error", message, options),
        warning: (message: string, options?: ToastOptions) => toast("warning", message, options),
        info: (message: string, options?: ToastOptions) => toast("info", message, options),
    };
}

// Export the toast function directly for convenience
export const toast = sonnerToast;
