"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Award, CheckCircle2, XCircle, AlertCircle, Timer, Users } from "lucide-react";
import { trpc } from "@/lib/trpc/client";
import { cn } from "@/lib/utils";
import { DropdownMultiSelect } from "@/components/ui/dropdown-multi-select";
import { DataTable } from "@/components/ui/data-table";
import type { ColumnDef } from "@tanstack/react-table";

type SubmissionStatus = "NOT_SUBMITTED" | "SUBMITTED" | "AUTO_SUBMITTED";

type StudentSourceFilter = "all" | "batch" | "individual";

interface StudentResponse {
    id: string;
    name: string;
    email: string;
    profileId: string;
    profileImage: string | null;
    submissionStatus: SubmissionStatus | null;
    score: string | null;
    totalScore: string | null;
    startTime: Date | null;
    endTime: Date | null;
    submissionTime: Date | null;
    isViolated: boolean | null;
}

interface QuizResultsTableProps {
    quizId: string;
    courseId: string;
}

function getStatusConfig(status: SubmissionStatus | null) {
    switch (status) {
        case "SUBMITTED":
            return {
                label: "Submitted",
                color: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
                icon: CheckCircle2,
            };
        case "AUTO_SUBMITTED":
            return {
                label: "Auto Submitted",
                color: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
                icon: Timer,
            };
        case "NOT_SUBMITTED":
            return {
                label: "Not Submitted",
                color: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
                icon: XCircle,
            };
        default:
            return {
                label: "Not Started",
                color: "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400",
                icon: AlertCircle,
            };
    }
}

const columns: ColumnDef<StudentResponse>[] = [
    {
        accessorKey: "name",
        header: "Student",
        size: 280,
        minSize: 200,
        cell: ({ row }) => {
            const student = row.original;
            return (
                <div className="flex items-center gap-3">
                    <Avatar className="h-8 w-8">
                        <AvatarImage src={student.profileImage || undefined} />
                        <AvatarFallback className="text-xs">
                            {student.name
                                .split(" ")
                                .map((n) => n[0])
                                .join("")
                                .toUpperCase()
                                .slice(0, 2)}
                        </AvatarFallback>
                    </Avatar>
                    <div>
                        <div className="font-medium flex items-center gap-2">
                            {student.name}
                            {student.isViolated && (
                                <Badge variant="destructive" className="text-xs">
                                    Violation
                                </Badge>
                            )}
                        </div>
                        <div className="text-xs text-muted-foreground">{student.email}</div>
                    </div>
                </div>
            );
        },
    },
    {
        accessorKey: "profileId",
        header: "Profile ID",
        size: 150,
        minSize: 100,
        cell: ({ row }) => <span className="font-mono text-sm">{row.original.profileId}</span>,
    },
    {
        accessorKey: "submissionStatus",
        header: "Status",
        size: 150,
        minSize: 120,
        cell: ({ row }) => {
            const statusConfig = getStatusConfig(row.original.submissionStatus);
            const StatusIcon = statusConfig.icon;
            return (
                <Badge variant="outline" className={cn("gap-1", statusConfig.color)}>
                    <StatusIcon className="h-3 w-3" />
                    {statusConfig.label}
                </Badge>
            );
        },
    },
    {
        accessorKey: "score",
        header: "Score",
        size: 120,
        minSize: 80,
        cell: ({ row }) => {
            const student = row.original;
            const score = student.score;
            const totalScore = student.totalScore;
            // Check for both null and undefined, and ensure we have actual values
            if (score != null && totalScore != null) {
                return (
                    <div className="flex items-center gap-1">
                        <Award className="h-4 w-4 text-primary" />
                        <span className="font-medium">{score}</span>
                        <span className="text-muted-foreground">/ {totalScore}</span>
                    </div>
                );
            }
            return <span className="text-muted-foreground">-</span>;
        },
    },
    {
        accessorKey: "submissionTime",
        header: "Submitted At",
        size: 140,
        minSize: 100,
        cell: ({ row }) => {
            const submissionTime = row.original.submissionTime;
            if (submissionTime) {
                return (
                    <div className="text-sm">{format(new Date(submissionTime), "MMM dd, p")}</div>
                );
            }
            return <span className="text-muted-foreground">-</span>;
        },
    },
];

export function QuizResultsTable({ quizId, courseId }: QuizResultsTableProps) {
    const router = useRouter();
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedBatchIds, setSelectedBatchIds] = useState<string[]>([]);
    const [studentSourceFilter, setStudentSourceFilter] = useState<StudentSourceFilter>("all");
    const [pageIndex, setPageIndex] = useState(0);
    const [pageSize, setPageSize] = useState(20);

    const { data: batches, isLoading: batchesLoading } =
        trpc.facultyQuiz.getResultsBatches.useQuery({ quizId });

    const batchOptions = useMemo(
        () =>
            batches?.map((batch) => ({
                label: `${batch.name} - ${batch.section}`,
                value: batch.id,
            })) ?? [],
        [batches]
    );

    const { data: studentsData, isLoading: studentsLoading } =
        trpc.facultyQuiz.getStudentResponses.useQuery({
            quizId,
            batchIds:
                studentSourceFilter !== "individual" && selectedBatchIds.length > 0
                    ? selectedBatchIds
                    : undefined,
            showIndividualOnly: studentSourceFilter === "individual" || undefined,
            searchTerm: searchQuery || undefined,
            limit: pageSize,
            offset: pageIndex * pageSize,
        });

    const students = useMemo(
        () => (studentsData?.students ?? []) as StudentResponse[],
        [studentsData?.students]
    );
    const total = studentsData?.total ?? 0;
    const pageCount = Math.ceil(total / pageSize);

    const handleBatchChange = (values: string[]) => {
        setSelectedBatchIds(values);
        setPageIndex(0);
    };

    const handleStudentSourceChange = (value: StudentSourceFilter) => {
        setStudentSourceFilter(value);
        if (value === "individual") {
            setSelectedBatchIds([]);
        }
        setPageIndex(0);
    };

    const handleRowClick = (row: StudentResponse) => {
        router.push(`/course/${courseId}/quiz/${quizId}/results/student/${row.id}`);
    };

    const handleFilterChange = (value: string) => {
        setSearchQuery(value);
        setPageIndex(0);
    };

    const toolbarExtras = (
        <>
            <Select
                value={studentSourceFilter}
                onValueChange={(value) => handleStudentSourceChange(value as StudentSourceFilter)}
            >
                <SelectTrigger className="w-40">
                    <SelectValue placeholder="Student source" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="all">All Students</SelectItem>
                    <SelectItem value="batch">By Batch Only</SelectItem>
                    <SelectItem value="individual">Individual Only</SelectItem>
                </SelectContent>
            </Select>
            {studentSourceFilter !== "individual" && (
                <DropdownMultiSelect
                    options={batchOptions}
                    selected={selectedBatchIds}
                    onChange={handleBatchChange}
                    allLabel="All Batches"
                    className="w-[200px]"
                    disabled={batchesLoading}
                />
            )}
        </>
    );

    if (students.length === 0 && !studentsLoading && !searchQuery) {
        return (
            <div className="space-y-6">
                <div className="flex justify-between items-center">
                    <div>
                        <h1 className="text-2xl sm:text-3xl font-bold">Quiz Results</h1>
                        <p className="text-sm text-muted-foreground mt-1">
                            View student submissions and scores
                        </p>
                    </div>
                </div>
                <div className="text-center text-muted-foreground py-12">
                    <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p className="text-lg font-medium">No responses found</p>
                    <p className="text-sm">No students have responded to this quiz yet</p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-bold">Quiz Results</h1>
                    <p className="text-sm text-muted-foreground mt-1">
                        View student submissions and scores
                    </p>
                </div>
            </div>

            <DataTable
                columns={columns}
                data={students}
                filterColumn="name"
                filterPlaceholder="Search by name, email, or ID..."
                filterValue={searchQuery}
                onFilterChange={handleFilterChange}
                pageIndex={pageIndex}
                pageSize={pageSize}
                pageCount={pageCount}
                onPageIndexChange={setPageIndex}
                onPageSizeChange={(size) => {
                    setPageSize(size);
                    setPageIndex(0);
                }}
                onRowClick={handleRowClick}
                initialPageSize={20}
                isLoading={studentsLoading}
                toolbarExtras={toolbarExtras}
            />
        </div>
    );
}
