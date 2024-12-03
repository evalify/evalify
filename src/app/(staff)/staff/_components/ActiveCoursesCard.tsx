
import { Card } from "@/components/ui/card";
import { BookOpen } from "lucide-react";
import Link from "next/link";

export default function ActiveCoursesCard({ courses }: { courses: any[] }) {
    return (
        <Card className="p-6">
            <h2 className="text-xl font-semibold mb-6">Active Courses</h2>
            <div className="space-y-4">
                {courses.map((course) => (
                    <Link href={`/staff/quiz`} key={course.id}>
                        <div className="flex items-center gap-4 p-4 hover:bg-muted rounded-lg transition-colors">
                            <BookOpen className="h-5 w-5 text-muted-foreground" />
                            <div>
                                <h3 className="font-medium">{course.name}</h3>
                                <p className="text-sm text-muted-foreground">
                                    {course.class.name} • {course.class.studentCount} students
                                </p>
                            </div>
                        </div>
                    </Link>
                ))}
            </div>
        </Card>
    );
}