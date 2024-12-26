import { Button } from "@/components/ui/button";
import { Plus, FileUp, Settings } from "lucide-react";
import Link from "next/link";

export default function QuickActions() {
    return (
        <div className="flex gap-2">
            <Link href='/staff/quiz'>
                <Button variant="default" size="sm">
                    <Plus className="h-4 w-4 mr-2" />
                    New Quiz
                </Button>
            </Link>
            <Link href='/staff/sharepoint'>
                <Button variant="outline" size="sm">
                    <FileUp className="h-4 w-4 mr-2" />
                    Upload
                </Button>
            </Link>
            <Link href='/staff/quiz'>
                <Button variant="ghost" size="icon">
                    <Settings className="h-4 w-4" />
                </Button>
            </Link>
        </div>
    );
}
