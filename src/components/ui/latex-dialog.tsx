import { useState } from 'react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from './dialog';
import { Button } from './button';
import { Textarea } from './textarea';
import { LatexPreview } from '../latex-preview';

interface LatexDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onInsert: (latex: string) => void;
}

export function LatexDialog({ open, onOpenChange, onInsert }: LatexDialogProps) {
    const [latex, setLatex] = useState('');

    const handleInsert = () => {
        if (latex.trim()) {
            onInsert(latex);
            setLatex('');
            onOpenChange(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[700px]">
                <DialogHeader>
                    <DialogTitle>Insert LaTeX Equation</DialogTitle>
                </DialogHeader>
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <label className="text-sm font-medium">Equation</label>
                        <Textarea
                            value={latex}
                            onChange={(e) => setLatex(e.target.value)}
                            placeholder="Enter LaTeX equation..."
                            className="font-mono min-h-[200px]"
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="text-sm font-medium">Preview</label>
                        <div className="border rounded-md p-4 min-h-[200px] bg-muted/20">
                            <LatexPreview content={`$${latex}$`} />
                        </div>
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>
                        Cancel
                    </Button>
                    <Button onClick={handleInsert}>Insert</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
