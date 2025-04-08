"use client";
import React, { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import TiptapRenderer from "@/components/ui/tiptap-renderer";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  ArrowLeft,
  CheckCircle,
  FileDown,
  Pencil,
  Search,
  X,
} from "lucide-react";
import { LatexPreview } from "@/components/latex-preview";
import ReactMarkdown from "react-markdown";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type Props = {
  params: {
    quizid: string;
    questionid: string;
  };
};

type Option = {
  option: string;
  optionId: string;
  image?: string;
};

type Question = {
  _id: string;
  question: string;
  options?: Option[];
  answer?: string[];
  mark: number;
  type: string;
  explanation?: string;
  expectedAnswer?: string;
};

type StudentAnswer = {
  name: string;
  rollNo: string;
  id: string;
  responseId: string;
  score: number;
  student_answer: string[];
  negative_score?: number;
  remarks?: string;
  breakdown?: string;
};

function Page({ params }: Props) {
  const unwrappedParams = use(params);
  const { quizid, questionid } = unwrappedParams;

  const [question, setQuestion] = useState<Question | null>(null);
  const [studentAnswers, setStudentAnswers] = useState<StudentAnswer[]>([]);
  const [quiz, setQuiz] = useState<any>(null);
  const [editingStudent, setEditingStudent] = useState<string | null>(null);
  const [batchMarkValue, setBatchMarkValue] = useState<number>(0);
  const [showConfirmDialog, setShowConfirmDialog] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const router = useRouter();

  useEffect(() => {
    fetch(
      `/api/staff/result/question?quizid=${quizid}&questionid=${questionid}`,
    ).then((res) => {
      if (res.ok) {
        res.json().then((data) => {
          setQuiz(data.quiz || {});
          setQuestion(data.questions?.[0] || null);
          setStudentAnswers(data.studentAnswers || []);
        });
      } else {
        console.log("Error fetching questions");
        toast.error("Failed to fetch question data");
      }
    });
  }, [quizid, questionid]);

  const handleMarkUpdate = async (
    studentId: string,
    score: number,
    remarks?: string,
    breakdown?: string,
  ) => {
    try {
      const response = await fetch(`/api/staff/result/${studentId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          questionId: questionid,
          score,
          remarks,
          breakdown,
        }),
      });

      if (response.ok) {
        toast.success("Marks updated successfully");

        setStudentAnswers((prevAnswers) =>
          prevAnswers.map((answer) => {
            if (!answer) return answer;

            return answer.responseId === studentId
              ? { ...answer, score, remarks, breakdown }
              : answer;
          })
        );
      } else {
        toast.error("Failed to update marks");
      }
    } catch (error) {
      toast.error("Failed to update marks");
    }
  };

  const handleBatchMarkUpdate = async () => {
    try {
      const attemptedStudents = studentAnswers.filter((student) => {
        if (!student) return false;

        const isNotAttempted = !student.student_answer ||
          (Array.isArray(student.student_answer) &&
            student.student_answer.every((ans) => !ans));
        return !isNotAttempted;
      });

      if (attemptedStudents.length === 0) {
        toast.info("No attempted responses to update");
        return;
      }

      if (batchMarkValue < 0 || (question && batchMarkValue > question.mark)) {
        toast.error(`Marks must be between 0 and ${question?.mark || 0}`);
        return;
      }

      // Show confirmation dialog instead of immediately updating
      setShowConfirmDialog(true);
    } catch (error) {
      toast.error("Failed to update marks");
    }
  };

  const confirmBatchMarkUpdate = async () => {
    setShowConfirmDialog(false);

    try {
      const attemptedStudents = studentAnswers.filter((student) => {
        if (!student) return false;
        const isNotAttempted = !student.student_answer ||
          (Array.isArray(student.student_answer) &&
            student.student_answer.every((ans) => !ans));
        return !isNotAttempted;
      });

      toast.promise(
        Promise.all(
          attemptedStudents.map((student) =>
            fetch(`/api/staff/result/${student.responseId}`, {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                questionId: questionid,
                score: batchMarkValue,
                remarks: student.remarks,
                breakdown: student.breakdown,
              }),
            })
          ),
        ),
        {
          loading: `Updating marks for ${attemptedStudents.length} students...`,
          success: () => {
            setStudentAnswers((prev) =>
              prev.map((student) => {
                if (!student) return student;

                const isNotAttempted = !student.student_answer ||
                  (Array.isArray(student.student_answer) &&
                    student.student_answer.every((ans) => !ans));

                if (!isNotAttempted) {
                  return { ...student, score: batchMarkValue };
                }
                return student;
              })
            );
            return `Updated marks to ${batchMarkValue} for all attempted responses`;
          },
          error: "Failed to update marks for all students",
        },
      );
    } catch (error) {
      toast.error("Failed to update marks");
    }
  };

  const handleEditStudent = (studentId: string) => {
    setEditingStudent(studentId === editingStudent ? null : studentId);
  };

  const renderStudentAnswer = (studentAnswer: StudentAnswer) => {
    if (!question) return null;
    if (!studentAnswer) return null;

    const isNotAttempted = !studentAnswer.student_answer ||
      (Array.isArray(studentAnswer.student_answer) &&
        studentAnswer.student_answer.every((ans) => !ans));

    if (isNotAttempted) {
      return (
        <div className="bg-slate-100 rounded-lg p-4 dark:bg-slate-900">
          <div className="flex items-center gap-2 text-muted-foreground">
            <span>Student did not attempt this question</span>
          </div>
        </div>
      );
    }

    switch (question.type) {
      case "MCQ":
      case "TRUE_FALSE":
        return (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {question.options?.map((option, index) => {
              const isCorrect = question.answer?.includes(option.optionId);
              const isSelected = Array.isArray(studentAnswer.student_answer)
                ? studentAnswer.student_answer?.includes(option.optionId)
                : false;

              return (
                <div
                  key={option.optionId}
                  className={`p-4 rounded-lg border ${
                    isCorrect && isSelected
                      ? "border-green-500 bg-green-50 dark:bg-green-900/20"
                      : isSelected && !isCorrect
                      ? "border-red-500 bg-red-50 dark:bg-red-900/20"
                      : isCorrect
                      ? "border-green-500 bg-green-50/50 dark:bg-green-900/10"
                      : "border-gray-200 dark:border-gray-700"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="font-medium">
                      {String.fromCharCode(65 + index)}.
                    </span>
                    <LatexPreview content={option.option} />
                    {isCorrect && isSelected && (
                      <CheckCircle className="w-4 h-4 text-green-500" />
                    )}
                    {!isCorrect && isSelected && (
                      <X className="w-4 h-4 text-red-500" />
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        );

      case "FILL_IN_BLANK":
      case "DESCRIPTIVE":
        return (
          <div className="bg-slate-100 rounded-lg p-4 dark:bg-slate-900">
            <div className="whitespace-pre-wrap break-all overflow-auto max-h-96">
              <div className="text-wrap break-words max-w-full">
                {Array.isArray(studentAnswer.student_answer) &&
                    studentAnswer.student_answer.length > 0
                  ? studentAnswer.student_answer[0]
                  : "No response"}
              </div>
            </div>
          </div>
        );

      case "CODING":
        try {
          const codeContent = Array.isArray(studentAnswer.student_answer) &&
              studentAnswer.student_answer.length > 0
            ? JSON.parse(studentAnswer.student_answer[0])?.[0]?.content ||
              "No code submitted"
            : "No code submitted";

          return (
            <div className="bg-slate-100 rounded-lg p-4 dark:bg-slate-900">
              <pre className="overflow-x-auto whitespace-pre-wrap break-words text-wrap max-h-96 p-2 bg-gray-50 dark:bg-gray-800 rounded-md w-full">
                {codeContent}
              </pre>
            </div>
          );
        } catch (error) {
          return (
            <div className="bg-slate-100 rounded-lg p-4 dark:bg-slate-900">
              <div className="text-red-500">Error parsing code submission</div>
            </div>
          );
        }

      case "FILE_UPLOAD":
        const fileUrl = Array.isArray(studentAnswer.student_answer) &&
            studentAnswer.student_answer.length > 0
          ? studentAnswer.student_answer[0]
          : "";

        return (
          <div className="bg-slate-100 rounded-lg p-4 dark:bg-slate-900">
            {fileUrl
              ? (
                <a
                  href={fileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-500 hover:underline inline-flex items-center"
                >
                  <FileDown className="h-4 w-4 mr-2" />
                  Download Submitted File
                </a>
              )
              : (
                "No file submitted"
              )}
          </div>
        );

      default:
        return <div>Unsupported question type</div>;
    }
  };

  // Filter students based on search query
  const filteredStudentAnswers = studentAnswers.filter(
    (answer) => {
      if (!answer) return false;

      const searchLower = searchQuery.toLowerCase();
      const nameMatch = answer.name?.toLowerCase().includes(searchLower);
      const rollNoMatch = answer.rollNo?.toLowerCase().includes(searchLower);

      return nameMatch || rollNoMatch;
    },
  );

  if (!question) {
    return <div className="p-6 text-center">Loading question data...</div>;
  }

  return (
    <div className="container mx-auto px-4 py-8 space-y-8">
      <Button
        variant="ghost"
        onClick={() => router.back()}
        className="mb-4"
      >
        <ArrowLeft className="w-4 h-4 mr-2" />
        Back
      </Button>

      {/* Confirmation Dialog */}
      <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Batch Mark Update</DialogTitle>
            <DialogDescription>
              Are you sure you want to set marks to {batchMarkValue}{" "}
              for all students who attempted this question? This action cannot
              be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowConfirmDialog(false)}
            >
              Cancel
            </Button>
            <Button onClick={confirmBatchMarkUpdate}>
              Yes, Update Marks
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Card className="w-full">
        <CardHeader>
          <div className="flex flex-col sm:flex-row justify-between">
            <div>
              <CardTitle>Question Analysis</CardTitle>
              <CardDescription>
                Review all student responses for this question
              </CardDescription>
            </div>
            <div className="text-right">
              <div className="text-sm text-muted-foreground">
                Quiz: {quiz?.title}
              </div>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          <div className="space-y-6">
            {/* Question details */}
            <div className="border-b pb-4">
              <h3 className="text-lg font-semibold mb-3">Question</h3>
              <div className="prose dark:prose-invert max-w-none break-words overflow-hidden">
                <TiptapRenderer content={question.question} />
              </div>

              {/* Show options for MCQ/True-False */}
              {(question.type === "MCQ" || question.type === "TRUE_FALSE") &&
                question.options && (
                <div className="mt-4">
                  <h4 className="text-md font-medium mb-2">Options</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {question.options.map((option, index) => (
                      <div
                        key={option.optionId}
                        className={`p-3 rounded-md border ${
                          question.answer?.includes(option.optionId)
                            ? "border-green-500 bg-green-50/50 dark:bg-green-900/10"
                            : "border-gray-200 dark:border-gray-700"
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <span>{String.fromCharCode(65 + index)}.</span>
                          <LatexPreview content={option.option} />
                          {question.answer?.includes(option.optionId) && (
                            <CheckCircle className="w-4 h-4 text-green-500" />
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Show expected answer for descriptive/fill-in-blank */}
              {(question.type === "DESCRIPTIVE" ||
                question.type === "FILL_IN_BLANK") &&
                question.expectedAnswer && (
                <div className="mt-4">
                  <h4 className="text-md font-medium mb-2">Expected Answer</h4>
                  <div className="p-3 rounded-md border border-green-200 bg-green-50/50 dark:bg-green-900/10">
                    <TiptapRenderer content={question.expectedAnswer} />
                  </div>
                </div>
              )}

              {/* Show explanation if available */}
              {question.explanation && (
                <div className="mt-4">
                  <h4 className="text-md font-medium mb-2">Explanation</h4>
                  <div className="p-3 rounded-md border border-blue-200 bg-blue-50/50 dark:bg-blue-900/10">
                    <TiptapRenderer content={question.explanation} />
                  </div>
                </div>
              )}
            </div>

            <h3 className="text-lg font-semibold">Student Responses</h3>
            <div className="text-sm text-muted-foreground mb-4">
              Total responses: {studentAnswers.length}, Max marks:{" "}
              {question.mark}
            </div>

            {/* Add batch marking section */}
            <Card className="bg-slate-50 dark:bg-slate-900 border-dashed">
              <CardContent className="p-4 sm:p-6">
                <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
                  <div>
                    <h4 className="font-medium mb-1">Batch Mark Assignment</h4>
                    <p className="text-sm text-muted-foreground">
                      Apply the same mark to all students who attempted this
                      question
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">Set marks:</span>
                      <Input
                        type="number"
                        value={batchMarkValue}
                        onChange={(e) =>
                          setBatchMarkValue(parseFloat(e.target.value) || 0)}
                        className="w-20"
                        max={question.mark}
                        min={0}
                      />
                      <span>/ {question.mark}</span>
                    </div>
                    <Button
                      onClick={handleBatchMarkUpdate}
                      size="sm"
                    >
                      Apply to All
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Search functionality */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by student name or roll number..."
                className="pl-10"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            <div className="space-y-6">
              {filteredStudentAnswers.length > 0
                ? (
                  filteredStudentAnswers
                    .filter((answer) => answer !== null && answer !== undefined)
                    .map((studentAnswer) => (
                      <Card
                        key={studentAnswer?.id || "unknown"}
                        className="overflow-hidden"
                      >
                        <CardHeader className="bg-slate-50 dark:bg-slate-900 p-4 sm:p-6">
                          <div className="flex justify-between items-center">
                            <div>
                              <h4 className="font-medium">
                                {studentAnswer?.name || "Unknown Student"}
                              </h4>
                              <p className="text-sm text-muted-foreground">
                                {studentAnswer?.rollNo
                                  ? studentAnswer.rollNo.toUpperCase()
                                  : "No Roll Number"}
                              </p>
                            </div>
                            <div className="flex items-center gap-3">
                              <div className="flex items-center gap-2">
                                <span className="font-medium">Marks:</span>
                                {studentAnswer &&
                                    editingStudent === studentAnswer.id
                                  ? (
                                    <Input
                                      type="number"
                                      value={studentAnswer.score || 0}
                                      onChange={(e) => {
                                        if (!studentAnswer) return;

                                        const value = parseFloat(
                                          e.target.value,
                                        );
                                        handleMarkUpdate(
                                          studentAnswer.responseId,
                                          value,
                                          studentAnswer.remarks,
                                          studentAnswer.breakdown,
                                        );
                                      }}
                                      className="w-20"
                                      max={question.mark}
                                      min={0}
                                    />
                                  )
                                  : <span>{studentAnswer?.score || 0}</span>}
                                <span>/ {question.mark}</span>
                              </div>
                              {studentAnswer && (
                                <Button
                                  size="sm"
                                  variant={editingStudent === studentAnswer.id
                                    ? "default"
                                    : "outline"}
                                  onClick={() => {
                                    if (!studentAnswer?.id) return;
                                    handleEditStudent(studentAnswer.id);
                                  }}
                                >
                                  <Pencil className="w-4 h-4 mr-1" />
                                  {editingStudent === studentAnswer?.id
                                    ? "Done"
                                    : "Edit"}
                                </Button>
                              )}
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent className="pt-4 p-4 sm:p-6">
                          <div className="space-y-4">
                            <div>
                              <h5 className="text-sm font-medium mb-2">
                                Response:
                              </h5>
                              {renderStudentAnswer(studentAnswer)}
                            </div>

                            {studentAnswer &&
                                editingStudent === studentAnswer.id
                              ? (
                                <div className="space-y-4 mt-4">
                                  <div>
                                    <label className="block text-sm font-medium mb-2">
                                      Remarks
                                    </label>
                                    <textarea
                                      className="w-full p-2 border rounded-md resize-vertical min-h-[100px]"
                                      value={studentAnswer.remarks || ""}
                                      onChange={(e) => {
                                        if (!studentAnswer?.responseId) {
                                          return;
                                        }

                                        const newRemarks = e.target.value;
                                        handleMarkUpdate(
                                          studentAnswer.responseId,
                                          studentAnswer.score || 0,
                                          newRemarks,
                                          studentAnswer.breakdown,
                                        );
                                      }}
                                    />
                                  </div>
                                  <div>
                                    <label className="block text-sm font-medium mb-2">
                                      Mark Breakdown
                                    </label>
                                    <textarea
                                      className="w-full p-2 border rounded-md resize-vertical min-h-[100px]"
                                      value={studentAnswer.breakdown || ""}
                                      onChange={(e) => {
                                        if (!studentAnswer?.responseId) {
                                          return;
                                        }

                                        const newBreakdown = e.target.value;
                                        handleMarkUpdate(
                                          studentAnswer.responseId,
                                          studentAnswer.score || 0,
                                          studentAnswer.remarks,
                                          newBreakdown,
                                        );
                                      }}
                                    />
                                  </div>
                                </div>
                              )
                              : (
                                <>
                                  {studentAnswer?.remarks && (
                                    <div className="mt-4">
                                      <h5 className="text-sm font-medium mb-2">
                                        Remarks:
                                      </h5>
                                      <pre className="bg-blue-50 rounded-lg p-4 dark:bg-blue-900/20 whitespace-pre-wrap break-words overflow-x-auto max-w-full">
                                          {studentAnswer.remarks}
                                      </pre>
                                    </div>
                                  )}

                                  {studentAnswer?.breakdown && (
                                    <div className="mt-4">
                                      <h5 className="text-sm font-medium mb-2">
                                        Mark Breakdown:
                                      </h5>
                                      <div className="bg-green-50 rounded-lg p-4 dark:bg-green-900/20 prose dark:prose-invert prose-sm max-w-none break-words overflow-hidden">
                                        <ReactMarkdown className="break-words">
                                          {studentAnswer.breakdown}
                                        </ReactMarkdown>
                                      </div>
                                    </div>
                                  )}
                                </>
                              )}
                          </div>
                        </CardContent>
                      </Card>
                    ))
                )
                : (
                  <div className="text-center py-8">
                    {searchQuery
                      ? "No matching students found. Try a different search term."
                      : "No student responses found for this question."}
                  </div>
                )}
            </div>
            {/* </ScrollArea> */}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default Page;
