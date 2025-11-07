"use client";

import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar, GraduationCap, ArrowRight } from "lucide-react";
import { useRouter } from "next/navigation";
import { Course } from "./course-list";

interface CourseCardProps {
    course: Course;
    colorClass: string;
    basePath?: string;
}

export function CourseCard({ course, colorClass, basePath = "/course" }: CourseCardProps) {
    const router = useRouter();

    return (
        <Card className="group relative overflow-hidden border bg-card/90 backdrop-blur-sm transition-colors">
            <CardHeader className="p-0">
                {/* Course Code Banner */}
                <div className={`relative overflow-hidden p-5 text-center ${colorClass}`}>
                    <div className="absolute inset-0 bg-white/15 dark:bg-black/20" />
                    <div className="relative z-10">
                        <GraduationCap className="mx-auto mb-2 size-7 opacity-95 drop-shadow" />
                        <h3 className="text-xl font-bold tracking-wide drop-shadow-sm">
                            {course.code}
                        </h3>
                    </div>
                    {/* Decorative elements */}
                    <div className="absolute -right-6 -top-6 h-16 w-16 rounded-full bg-white/20 dark:bg-black/30" />
                    <div className="absolute -bottom-3 -left-3 h-10 w-10 rounded-full bg-white/20 dark:bg-black/30" />
                </div>

                {/* Course Info */}
                <div className="p-5 pb-4">
                    <div className="mb-2 flex items-start justify-between gap-2">
                        <h4 className="line-clamp-2 flex-1 text-base font-semibold leading-tight text-foreground">
                            {course.name}
                        </h4>
                        <div className="ml-2 flex shrink-0 flex-col gap-2">
                            <Badge variant="secondary" className="flex items-center gap-1">
                                <Calendar className="size-3" />
                                {course.semesterName}
                                {course.semesterYear && ` (${course.semesterYear})`}
                            </Badge>
                            <Badge
                                variant={course.isActive === "ACTIVE" ? "default" : "outline"}
                                className="text-xs"
                            >
                                {course.isActive === "ACTIVE" ? "Active" : "Inactive"}
                            </Badge>
                        </div>
                    </div>
                    <div className="mb-3 min-h-[2.75rem]">
                        <p className="line-clamp-2 text-xs leading-relaxed text-muted-foreground">
                            {course.description}
                        </p>
                    </div>
                </div>
            </CardHeader>

            <CardContent className="p-5 pt-0">
                <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Badge
                            variant={course.type === "CORE" ? "default" : "secondary"}
                            className="text-xs"
                        >
                            {course.type === "CORE"
                                ? "Core"
                                : course.type === "ELECTIVE"
                                  ? "Elective"
                                  : "Micro Credential"}
                        </Badge>
                    </div>
                    <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                            router.push(`${basePath}/${course.id}/quiz`);
                        }}
                        className="h-7 px-2 text-xs"
                    >
                        View Quizzes
                        <ArrowRight className="ml-1 size-3 transition-transform group-hover:translate-x-0.5" />
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
}
