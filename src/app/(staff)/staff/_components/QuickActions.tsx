import { Button } from "@/components/ui/button";
import { Plus, FileUp, Settings } from "lucide-react";

export default function QuickActions() {
    return (
        <div className="flex gap-2">
            <Button variant="default" size="sm">
                <Plus className="h-4 w-4 mr-2" />
                New Quiz
            </Button>
            <Button variant="outline" size="sm">
                <FileUp className="h-4 w-4 mr-2" />
                Upload
            </Button>
            <Button variant="ghost" size="icon">
                <Settings className="h-4 w-4" />
            </Button>
        </div>
    );
}
