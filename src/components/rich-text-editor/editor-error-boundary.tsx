"use client";

import React, { Component, ErrorInfo, ReactNode } from "react";
import { AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

interface ErrorBoundaryProps {
    children: ReactNode;
    fallback?: ReactNode;
    onReset?: () => void;
}

interface ErrorBoundaryState {
    hasError: boolean;
    error: Error | null;
}

export class EditorErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
    constructor(props: ErrorBoundaryProps) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error: Error): ErrorBoundaryState {
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
        console.error("Editor Error:", error, errorInfo);
    }

    handleReset = () => {
        this.setState({ hasError: false, error: null });
        this.props.onReset?.();
    };

    render() {
        if (this.state.hasError) {
            if (this.props.fallback) {
                return this.props.fallback;
            }

            return (
                <Alert variant="destructive" className="m-4">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Editor Error</AlertTitle>
                    <AlertDescription className="mt-2">
                        <p className="mb-2">
                            Something went wrong with the editor. Please try again.
                        </p>
                        {this.state.error && (
                            <p className="text-xs font-mono mb-2">{this.state.error.message}</p>
                        )}
                        <Button variant="outline" size="sm" onClick={this.handleReset}>
                            Reset Editor
                        </Button>
                    </AlertDescription>
                </Alert>
            );
        }

        return this.props.children;
    }
}

export function LaTeXErrorBoundary({ children }: { children: ReactNode }) {
    return (
        <EditorErrorBoundary
            fallback={<span className="text-destructive text-sm">LaTeX Rendering Error</span>}
        >
            {children}
        </EditorErrorBoundary>
    );
}
