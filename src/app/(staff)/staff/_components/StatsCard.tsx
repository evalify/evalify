import { Card } from "@/components/ui/card";
import { ReactNode } from "react";

interface StatsCardProps {
    title: string;
    value: number;
    icon: ReactNode;
    trend: string;
}

export default function StatsCard({ title, value, icon, trend }: StatsCardProps) {
    return (
        <Card className="p-6 hover:shadow-lg transition-shadow">
            <div className="flex justify-between items-start">
                <div>
                    <p className="text-sm text-muted-foreground">{title}</p>
                    <h3 className="text-2xl font-bold mt-2">{value}</h3>
                    <p className="text-xs text-green-600 mt-1">{trend}</p>
                </div>
                <div className="text-muted-foreground">{icon}</div>
            </div>
        </Card>
    );
}
