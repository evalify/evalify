import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { LayoutGrid, List, Plus, Search } from "lucide-react";
import { Input } from "@/components/ui/input";

interface AdminPageHeaderProps {
    title: string;
    description?: string;
    onCreateClick: () => void;
    onViewToggle: (view: "grid" | "table") => void;
    currentView: "grid" | "table";
    searchValue: string;
    onSearchChange: (value: string) => void;
    createButtonText?: string;
}

export function AdminPageHeader({
    title,
    description,
    onCreateClick,
    onViewToggle,
    currentView,
    searchValue,
    onSearchChange,
    createButtonText = "Create",
}: AdminPageHeaderProps) {
    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-white">{title}</h1>
                    {description && <p className="text-gray-400 mt-2">{description}</p>}
                </div>
                <Button
                    onClick={onCreateClick}
                    className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                    <Plus className="w-4 h-4 mr-2" />
                    {createButtonText}
                </Button>
            </div>

            <Card className="bg-gray-800 border-gray-700">
                <CardContent className="p-4">
                    <div className="flex items-center justify-between space-x-4">
                        <div className="flex-1 relative">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                            <Input
                                placeholder={`Search ${title.toLowerCase()}...`}
                                value={searchValue}
                                onChange={(e) => onSearchChange(e.target.value)}
                                className="pl-10 bg-gray-700 border-gray-600 text-white placeholder-gray-400"
                            />
                        </div>
                        <div className="flex items-center space-x-2">
                            <Button
                                variant={currentView === "grid" ? "default" : "outline"}
                                size="sm"
                                onClick={() => onViewToggle("grid")}
                                className="bg-gray-700 border-gray-600 hover:bg-gray-600"
                            >
                                <LayoutGrid className="w-4 h-4" />
                            </Button>
                            <Button
                                variant={currentView === "table" ? "default" : "outline"}
                                size="sm"
                                onClick={() => onViewToggle("table")}
                                className="bg-gray-700 border-gray-600 hover:bg-gray-600"
                            >
                                <List className="w-4 h-4" />
                            </Button>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
