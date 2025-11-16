import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Edit, Trash2, Eye, MoreHorizontal } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

export interface GridCardProps {
    title: string;
    subtitle?: string;
    status: "ACTIVE" | "INACTIVE";
    metadata?: Array<{ label: string; value: string | number }>;
    onEdit: () => void;
    onDelete: () => void;
    onView?: () => void;
    children?: React.ReactNode;
}

export function GridCard({
    title,
    subtitle,
    status,
    metadata,
    onEdit,
    onDelete,
    onView,
    children,
}: GridCardProps) {
    return (
        <Card className="bg-gray-800 border-gray-700 hover:bg-gray-700 transition-colors">
            <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                    <div className="space-y-1">
                        <h3 className="font-semibold text-white truncate">{title}</h3>
                        {subtitle && <p className="text-sm text-gray-400 truncate">{subtitle}</p>}
                    </div>
                    <div className="flex items-center space-x-2">
                        <Badge
                            variant={status === "ACTIVE" ? "default" : "secondary"}
                            className={
                                status === "ACTIVE"
                                    ? "bg-green-600 hover:bg-green-700"
                                    : "bg-gray-600 hover:bg-gray-700"
                            }
                        >
                            {status}
                        </Badge>
                        <Popover>
                            <PopoverTrigger asChild>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-8 w-8 p-0 text-gray-400 hover:text-white"
                                >
                                    <MoreHorizontal className="w-4 h-4" />
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent
                                align="end"
                                className="w-40 bg-gray-800 border-gray-700 p-2"
                            >
                                <div className="space-y-1">
                                    {onView && (
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={onView}
                                            className="w-full justify-start text-gray-300 hover:text-white hover:bg-gray-700"
                                        >
                                            <Eye className="w-4 h-4 mr-2" />
                                            View
                                        </Button>
                                    )}
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={onEdit}
                                        className="w-full justify-start text-gray-300 hover:text-white hover:bg-gray-700"
                                    >
                                        <Edit className="w-4 h-4 mr-2" />
                                        Edit
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={onDelete}
                                        className="w-full justify-start text-red-400 hover:text-red-300 hover:bg-gray-700"
                                    >
                                        <Trash2 className="w-4 h-4 mr-2" />
                                        Delete
                                    </Button>
                                </div>
                            </PopoverContent>
                        </Popover>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="pt-0">
                {metadata && metadata.length > 0 && (
                    <div className="space-y-2">
                        {metadata.map((item, index) => (
                            <div key={index} className="flex justify-between text-sm">
                                <span className="text-gray-400">{item.label}</span>
                                <span className="text-gray-300">{item.value}</span>
                            </div>
                        ))}
                    </div>
                )}
                {children}
            </CardContent>
        </Card>
    );
}
