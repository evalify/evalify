"use client";

import { useParams, useRouter } from "next/navigation";
import { useState, useMemo } from "react";
import { format } from "date-fns";
import { DragDropContext, Droppable, Draggable, type DropResult } from "@hello-pangea/dnd";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from "@/components/ui/accordion";
import {
    Plus,
    Edit2,
    Trash2,
    GripVertical,
    MoreVertical,
    BarChart3,
    Calendar,
    Clock,
    FileText,
    Award,
} from "lucide-react";
import { trpc } from "@/lib/trpc/client";
import { useToast } from "@/hooks/use-toast";
import { useAnalytics } from "@/hooks/use-analytics";
import { QuestionRender } from "@/components/question/question-renderer";
import type { Question } from "@/types/questions";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ConfirmationDialog } from "@/components/ui/custom-alert-dialog";
import { AddFromBankDialog } from "@/components/quiz/add-from-bank-dialog";

type QuestionWithQuizMetadata = Question & {
    quizQuestionId: string;
    orderIndex: number;
};

/**
 * Page component for managing sections and questions of a specific quiz within a course.
 *
 * Renders quiz info, KPIs, and an interface to create, edit, reorder, move, and delete sections and questions,
 * including drag-and-drop support and dialogs for creating/editing sections, confirming deletes, and adding
 * questions from a question bank.
 *
 * @returns The React element for the quiz questions management page.
 */
export default function QuizQuestionsPage() {
    const params = useParams<{ courseId: string; quizId: string }>();
    const router = useRouter();
    const { success, error } = useToast();
    const { track } = useAnalytics();
    const courseId = Array.isArray(params.courseId) ? params.courseId[0] : params.courseId;
    const quizId = Array.isArray(params.quizId) ? params.quizId[0] : params.quizId;

    const [createSectionOpen, setCreateSectionOpen] = useState(false);
    const [editingSectionId, setEditingSectionId] = useState<string | null>(null);
    const [sectionName, setSectionName] = useState("");
    const [deletingSectionId, setDeletingSectionId] = useState<string | null>(null);
    const [sectionWithQuestionsError, setSectionWithQuestionsError] = useState<{
        sectionName: string;
        questionCount: number;
    } | null>(null);
    const [addFromBankOpen, setAddFromBankOpen] = useState(false);
    const [selectedSectionForBank, setSelectedSectionForBank] = useState<string | undefined>(
        undefined
    );

    const utils = trpc.useUtils();

    // Fetch quiz data
    const { data: quizData, isLoading: quizLoading } = trpc.facultyQuiz.getById.useQuery({
        quizId,
    });

    // Fetch sections
    const { data: sections, isLoading: sectionsLoading } = trpc.section.listByQuiz.useQuery({
        quizId,
        courseId,
    });

    // Calculate total marks from all questions in all sections
    const totalMarks = useMemo(() => {
        if (!sections) return 0;
        const total = 0;
        sections.forEach((section) => {
            // We'll need to fetch questions for each section to calculate marks
            // This will be handled by the SectionItem component
        });
        return total;
    }, [sections]);

    // Create section mutation
    const createSectionMutation = trpc.section.create.useMutation({
        onSuccess: () => {
            success("Section created successfully!");
            setCreateSectionOpen(false);
            setSectionName("");
            utils.section.listByQuiz.invalidate({ quizId, courseId });
            track("quiz_section_created", { quizId, courseId });
        },
        onError: (err) => {
            error(err.message || "Failed to create section");
        },
    });

    // Update section mutation
    const updateSectionMutation = trpc.section.updateName.useMutation({
        onSuccess: () => {
            success("Section name updated successfully!");
            setEditingSectionId(null);
            setSectionName("");
            utils.section.listByQuiz.invalidate({ quizId, courseId });
            track("quiz_section_updated", { quizId, courseId });
        },
        onError: (err) => {
            error(err.message || "Failed to update section");
        },
    });

    // Delete section mutation
    const deleteSectionMutation = trpc.section.delete.useMutation({
        onSuccess: () => {
            success("Section deleted successfully!");
            setDeletingSectionId(null);
            utils.section.listByQuiz.invalidate({ quizId, courseId });
            track("quiz_section_deleted", { quizId, courseId });
        },
        onError: (err) => {
            error(err.message || "Failed to delete section");
        },
    });

    // Reorder sections mutation
    const reorderSectionsMutation = trpc.section.reorderSections.useMutation({
        onSuccess: () => {
            utils.section.listByQuiz.invalidate({ quizId, courseId });
        },
        onError: (err) => {
            error(err.message || "Failed to reorder sections");
            utils.section.listByQuiz.invalidate({ quizId, courseId });
        },
    });

    // Move question mutation
    const moveQuestionMutation = trpc.section.moveQuestion.useMutation({
        onSuccess: () => {
            success("Question moved successfully!");
            // Invalidate all section queries to refresh
            utils.section.listQuestionsInSection.invalidate();
        },
        onError: (err) => {
            error(err.message || "Failed to move question");
            utils.section.listQuestionsInSection.invalidate();
        },
    });

    // Reorder questions mutation
    const reorderQuestionsMutation = trpc.section.reorderQuestions.useMutation({
        onSuccess: () => {
            utils.section.listQuestionsInSection.invalidate();
        },
        onError: (err) => {
            error(err.message || "Failed to reorder questions");
            utils.section.listQuestionsInSection.invalidate();
        },
    });

    const handleCreateSection = () => {
        if (!sectionName.trim()) {
            error("Section name cannot be empty");
            return;
        }
        createSectionMutation.mutate({
            quizId,
            courseId,
            name: sectionName,
        });
    };

    const handleUpdateSection = () => {
        if (!sectionName.trim() || !editingSectionId) {
            error("Section name cannot be empty");
            return;
        }
        updateSectionMutation.mutate({
            sectionId: editingSectionId,
            courseId,
            name: sectionName,
        });
    };

    const handleDeleteSection = () => {
        if (!deletingSectionId) return;

        // Check if section has questions
        const section = sections?.find((s) => s.id === deletingSectionId);
        if (!section) return;

        // We need to fetch the questions for this section to check if it's empty
        // This is handled by checking in the SectionItem component before calling this
        deleteSectionMutation.mutate({
            sectionId: deletingSectionId,
            courseId,
        });
    };

    const handleAddQuestion = (sectionId?: string) => {
        const url = sectionId
            ? `/course/${courseId}/quiz/${quizId}/question/create?sectionId=${sectionId}`
            : `/course/${courseId}/quiz/${quizId}/question/create`;
        router.push(url);
    };

    const openEditDialog = (sectionId: string, currentName: string) => {
        setEditingSectionId(sectionId);
        setSectionName(currentName);
    };

    const handleSectionDragEnd = (result: DropResult) => {
        if (!result.destination || !sections) return;

        const items = Array.from(sections);
        const [reorderedItem] = items.splice(result.source.index, 1);
        items.splice(result.destination.index, 0, reorderedItem);

        // Update with new order indices
        const sectionOrders = items.map((section, index) => ({
            sectionId: section.id,
            orderIndex: index,
        }));

        reorderSectionsMutation.mutate({
            quizId,
            courseId,
            sectionOrders,
        });
    };

    const handleQuestionDragEnd = (result: DropResult) => {
        if (!result.destination) return;

        const sourceSectionId = result.source.droppableId.replace("questions-", "");
        const destinationSectionId = result.destination.droppableId.replace("questions-", "");

        // Get the draggable question id (it's the quizQuestionId)
        const quizQuestionId = result.draggableId;

        // If moving within the same section, just reorder
        if (sourceSectionId === destinationSectionId) {
            reorderQuestionsMutation.mutate({
                quizId,
                courseId,
                sectionId: sourceSectionId === "null" ? null : sourceSectionId,
                questionOrders: [
                    {
                        quizQuestionId,
                        orderIndex: result.destination.index,
                    },
                ],
            });
        } else {
            // Moving to a different section
            moveQuestionMutation.mutate({
                quizId,
                courseId,
                quizQuestionId,
                targetSectionId: destinationSectionId === "null" ? null : destinationSectionId,
                targetOrderIndex: result.destination.index,
            });
        }
    };

    const handleDragEnd = (result: DropResult) => {
        if (!result.destination) return;

        // Check if we're dragging a section or a question
        if (result.type === "SECTION") {
            handleSectionDragEnd(result);
        } else if (result.type === "QUESTION") {
            handleQuestionDragEnd(result);
        }
    };

    return (
        <div>
            <DragDropContext onDragEnd={handleDragEnd}>
                <div className="container mx-auto px-4 py-6 space-y-6">
                    {/* Quiz Info Card */}
                    {quizLoading ? (
                        <Card>
                            <CardContent className="p-6">
                                <p className="text-sm text-muted-foreground text-center">
                                    Loading quiz information...
                                </p>
                            </CardContent>
                        </Card>
                    ) : quizData ? (
                        <Card className="overflow-hidden border-2">
                            <div className="bg-linear-to-r from-primary/10 via-primary/5 to-background px-6 py-4 border-b">
                                <div className="flex items-start justify-between gap-4">
                                    <div className="flex-1">
                                        <h2 className="text-2xl font-bold text-foreground mb-2 flex items-center gap-2">
                                            <FileText className="h-6 w-6 text-primary" />
                                            {quizData.name}
                                        </h2>
                                        {quizData.description && (
                                            <p className="text-sm text-muted-foreground leading-relaxed">
                                                {quizData.description}
                                            </p>
                                        )}
                                    </div>
                                    {/* Action Buttons */}
                                    <div className="flex flex-row gap-2">
                                        <Button
                                            onClick={() =>
                                                router.push(
                                                    `/course/${courseId}/quiz/${quizId}/results`
                                                )
                                            }
                                            className="flex items-center gap-2"
                                            size="sm"
                                        >
                                            <BarChart3 className="h-4 w-4" />
                                            Results
                                        </Button>
                                        <Button
                                            onClick={() =>
                                                router.push(
                                                    `/course/${courseId}/quiz/${quizId}/manage`
                                                )
                                            }
                                            variant="outline"
                                            size="sm"
                                            className="flex items-center gap-2"
                                        >
                                            <Edit2 className="h-4 w-4" />
                                            Edit
                                        </Button>
                                    </div>
                                </div>
                            </div>

                            <CardContent className="p-6">
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                                    <div className="relative overflow-hidden rounded-lg border bg-card p-4 hover:shadow-md transition-shadow">
                                        <div className="absolute top-0 right-0 w-20 h-20 bg-blue-500/10 rounded-full -mr-10 -mt-10" />
                                        <div className="relative flex items-start gap-3">
                                            <div className="p-2.5 bg-blue-100 dark:bg-blue-900/30 rounded-lg shrink-0">
                                                <Calendar className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">
                                                    Start Time
                                                </p>
                                                <p className="text-sm font-semibold text-foreground">
                                                    {format(
                                                        new Date(quizData.startTime),
                                                        "MMM dd, yyyy"
                                                    )}
                                                </p>
                                                <p className="text-xs text-muted-foreground">
                                                    {format(new Date(quizData.startTime), "p")}
                                                </p>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="relative overflow-hidden rounded-lg border bg-card p-4 hover:shadow-md transition-shadow">
                                        <div className="absolute top-0 right-0 w-20 h-20 bg-purple-500/10 rounded-full -mr-10 -mt-10" />
                                        <div className="relative flex items-start gap-3">
                                            <div className="p-2.5 bg-purple-100 dark:bg-purple-900/30 rounded-lg shrink-0">
                                                <Calendar className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">
                                                    End Time
                                                </p>
                                                <p className="text-sm font-semibold text-foreground">
                                                    {format(
                                                        new Date(quizData.endTime),
                                                        "MMM dd, yyyy"
                                                    )}
                                                </p>
                                                <p className="text-xs text-muted-foreground">
                                                    {format(new Date(quizData.endTime), "p")}
                                                </p>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="relative overflow-hidden rounded-lg border bg-card p-4 hover:shadow-md transition-shadow">
                                        <div className="absolute top-0 right-0 w-20 h-20 bg-green-500/10 rounded-full -mr-10 -mt-10" />
                                        <div className="relative flex items-start gap-3">
                                            <div className="p-2.5 bg-green-100 dark:bg-green-900/30 rounded-lg shrink-0">
                                                <Clock className="h-5 w-5 text-green-600 dark:text-green-400" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">
                                                    Duration
                                                </p>
                                                <p className="text-sm font-semibold text-foreground">
                                                    {quizData.duration}
                                                </p>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="relative overflow-hidden rounded-lg border bg-card p-4 hover:shadow-md transition-shadow">
                                        <div className="absolute top-0 right-0 w-20 h-20 bg-orange-500/10 rounded-full -mr-10 -mt-10" />
                                        <div className="relative flex items-start gap-3">
                                            <div className="p-2.5 bg-orange-100 dark:bg-orange-900/30 rounded-lg shrink-0">
                                                <Award className="h-5 w-5 text-orange-600 dark:text-orange-400" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">
                                                    Total Marks
                                                </p>
                                                <p className="text-sm font-semibold text-foreground">
                                                    <TotalMarksDisplay
                                                        sections={sections || []}
                                                        quizId={quizId}
                                                        courseId={courseId}
                                                    />
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ) : null}

                    <div className="flex justify-between items-center">
                        <div>
                            <h1 className="text-2xl sm:text-3xl font-bold">Quiz Questions</h1>
                            <p className="text-sm text-muted-foreground mt-1">
                                Manage sections and questions for this quiz
                            </p>
                        </div>
                        <div className="flex gap-2">
                            <Button
                                onClick={() => setCreateSectionOpen(true)}
                                className="flex items-center gap-2"
                            >
                                <Plus className="h-4 w-4" />
                                Add Section
                            </Button>
                        </div>
                    </div>

                    {sectionsLoading ? (
                        <Card>
                            <CardContent className="p-8">
                                <p className="text-sm text-muted-foreground text-center">
                                    Loading sections...
                                </p>
                            </CardContent>
                        </Card>
                    ) : sections && sections.length > 0 ? (
                        <Droppable droppableId="sections-list" type="SECTION">
                            {(provided) => (
                                <div {...provided.droppableProps} ref={provided.innerRef}>
                                    <Accordion
                                        type="multiple"
                                        defaultValue={sections.map((s) => s.id)}
                                    >
                                        {sections.map((section, index) => (
                                            <Draggable
                                                key={section.id}
                                                draggableId={`section-${section.id}`}
                                                index={index}
                                            >
                                                {(provided, snapshot) => (
                                                    <div
                                                        ref={provided.innerRef}
                                                        {...provided.draggableProps}
                                                    >
                                                        <SectionItem
                                                            section={section}
                                                            quizId={quizId}
                                                            courseId={courseId}
                                                            onEdit={(name) =>
                                                                openEditDialog(section.id, name)
                                                            }
                                                            onDelete={(
                                                                sectionName,
                                                                questionCount
                                                            ) => {
                                                                if (questionCount > 0) {
                                                                    setSectionWithQuestionsError({
                                                                        sectionName,
                                                                        questionCount,
                                                                    });
                                                                } else {
                                                                    setDeletingSectionId(
                                                                        section.id
                                                                    );
                                                                }
                                                            }}
                                                            onAddQuestion={(sectionId) =>
                                                                handleAddQuestion(sectionId)
                                                            }
                                                            onAddFromBank={(sectionId) => {
                                                                setSelectedSectionForBank(
                                                                    sectionId
                                                                );
                                                                setAddFromBankOpen(true);
                                                            }}
                                                            dragHandleProps={
                                                                provided.dragHandleProps
                                                            }
                                                            isDragging={snapshot.isDragging}
                                                        />
                                                    </div>
                                                )}
                                            </Draggable>
                                        ))}
                                    </Accordion>
                                    {provided.placeholder}
                                </div>
                            )}
                        </Droppable>
                    ) : (
                        <Card>
                            <CardHeader>
                                <CardTitle>Questions</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-sm text-muted-foreground">
                                    No sections created yet. Click &quot;Add Section&quot; to
                                    organize questions into sections, or &quot;Add Question&quot; to
                                    add questions without sections.
                                </p>
                            </CardContent>
                        </Card>
                    )}
                </div>

                {/* Create Section Dialog */}
                <Dialog open={createSectionOpen} onOpenChange={setCreateSectionOpen}>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Create Section</DialogTitle>
                            <DialogDescription>
                                Add a new section to organize your quiz questions.
                            </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4 py-4">
                            <div className="space-y-2">
                                <Label htmlFor="section-name">Section Name</Label>
                                <Input
                                    id="section-name"
                                    placeholder="Enter section name"
                                    value={sectionName}
                                    onChange={(e) => setSectionName(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === "Enter") {
                                            handleCreateSection();
                                        }
                                    }}
                                />
                            </div>
                        </div>
                        <DialogFooter>
                            <Button
                                variant="outline"
                                onClick={() => {
                                    setCreateSectionOpen(false);
                                    setSectionName("");
                                }}
                            >
                                Cancel
                            </Button>
                            <Button
                                onClick={handleCreateSection}
                                disabled={createSectionMutation.isPending}
                            >
                                {createSectionMutation.isPending ? "Creating..." : "Create"}
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>

                {/* Edit Section Dialog */}
                <Dialog
                    open={!!editingSectionId}
                    onOpenChange={(open) => !open && setEditingSectionId(null)}
                >
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Edit Section Name</DialogTitle>
                            <DialogDescription>Update the name of this section.</DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4 py-4">
                            <div className="space-y-2">
                                <Label htmlFor="edit-section-name">Section Name</Label>
                                <Input
                                    id="edit-section-name"
                                    placeholder="Enter section name"
                                    value={sectionName}
                                    onChange={(e) => setSectionName(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === "Enter") {
                                            handleUpdateSection();
                                        }
                                    }}
                                />
                            </div>
                        </div>
                        <DialogFooter>
                            <Button
                                variant="outline"
                                onClick={() => {
                                    setEditingSectionId(null);
                                    setSectionName("");
                                }}
                            >
                                Cancel
                            </Button>
                            <Button
                                onClick={handleUpdateSection}
                                disabled={updateSectionMutation.isPending}
                            >
                                {updateSectionMutation.isPending ? "Updating..." : "Update"}
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>

                {/* Delete Section Dialog */}
                <ConfirmationDialog
                    isOpen={!!deletingSectionId}
                    onOpenChange={(open) => !open && setDeletingSectionId(null)}
                    onAccept={handleDeleteSection}
                    title="Delete Section"
                    message="Are you sure you want to delete this section?"
                    confirmButtonText="Delete"
                    cancelButtonText="Cancel"
                />

                {/* Section with Questions Error Dialog */}
                <Dialog
                    open={!!sectionWithQuestionsError}
                    onOpenChange={(open) => !open && setSectionWithQuestionsError(null)}
                >
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Cannot Delete Section</DialogTitle>
                            <DialogDescription>
                                The section &quot;{sectionWithQuestionsError?.sectionName}&quot;
                                contains {sectionWithQuestionsError?.questionCount}{" "}
                                {sectionWithQuestionsError?.questionCount === 1
                                    ? "question"
                                    : "questions"}
                                .
                            </DialogDescription>
                        </DialogHeader>
                        <div className="py-4">
                            <p className="text-sm text-muted-foreground">
                                To delete this section, you must first remove all questions from it.
                                You can either:
                            </p>
                            <ul className="list-disc list-inside text-sm text-muted-foreground mt-2 space-y-1 ml-2">
                                <li>Delete the questions individually</li>
                                <li>Move the questions to another section by dragging them</li>
                            </ul>
                        </div>
                        <DialogFooter>
                            <Button
                                onClick={() => setSectionWithQuestionsError(null)}
                                variant="default"
                            >
                                Got it
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>

                {/* Add From Bank Dialog */}
                <AddFromBankDialog
                    isOpen={addFromBankOpen}
                    onOpenChange={setAddFromBankOpen}
                    quizId={quizId}
                    courseId={courseId}
                    sectionId={selectedSectionForBank}
                />
            </DragDropContext>
        </div>
    );
}

/**
 * Render an accordion item for a quiz section with controls to view, add, edit, delete, and manage its questions.
 *
 * @param section - Object containing the section's `id` and `name`.
 * @param quizId - Identifier of the quiz that the section belongs to.
 * @param courseId - Identifier of the course that contains the quiz.
 * @param onEdit - Callback invoked with the current section name to start editing the section.
 * @param onDelete - Callback invoked to request deletion; receives the section's name and the current question count.
 * @param onAddQuestion - Callback invoked with the section `id` to add a new question directly into this section.
 * @param onAddFromBank - Callback invoked with the section `id` to add questions from the question bank into this section.
 * @param dragHandleProps - Optional props spread onto the section's drag handle to enable drag-and-drop.
 * @param isDragging - Optional boolean that indicates whether the section is currently being dragged (affects styling).
 * @returns A JSX element rendering the section accordion, its question list, and action controls.
 */
function SectionItem({
    section,
    quizId,
    courseId,
    onEdit,
    onDelete,
    onAddQuestion,
    onAddFromBank,
    dragHandleProps,
    isDragging,
}: {
    section: { id: string; name: string };
    quizId: string;
    courseId: string;
    onEdit: (name: string) => void;
    onDelete: (sectionName: string, questionCount: number) => void;
    onAddQuestion: (sectionId: string) => void;
    onAddFromBank: (sectionId: string) => void;
    dragHandleProps?: object | null;
    isDragging?: boolean;
}) {
    const router = useRouter();
    const { success, error } = useToast();
    const { track } = useAnalytics();
    const utils = trpc.useUtils();

    const { data: questions, isLoading } = trpc.section.listQuestionsInSection.useQuery({
        sectionId: section.id,
        quizId,
        courseId,
    });

    const [deletingQuestionId, setDeletingQuestionId] = useState<string | null>(null);

    // Delete question mutation
    const deleteQuestionMutation = trpc.question.deleteFromQuiz.useMutation({
        onSuccess: () => {
            success("Question removed from quiz successfully!");
            setDeletingQuestionId(null);
            utils.section.listQuestionsInSection.invalidate({
                sectionId: section.id,
                quizId,
                courseId,
            });
            track("quiz_question_deleted", { quizId, courseId });
        },
        onError: (err) => {
            error(err.message || "Failed to remove question");
        },
    });

    const handleEditQuestion = (questionId: string) => {
        router.push(`/course/${courseId}/quiz/${quizId}/question/${questionId}`);
    };

    const handleDeleteQuestion = (questionId: string) => {
        setDeletingQuestionId(questionId);
    };

    const confirmDeleteQuestion = () => {
        if (deletingQuestionId) {
            deleteQuestionMutation.mutate({
                questionId: deletingQuestionId,
                quizId,
                courseId,
            });
        }
    };

    return (
        <>
            <AccordionItem
                value={section.id}
                className={`border rounded-lg mb-4 px-4 ${isDragging ? "opacity-50" : ""}`}
            >
                <AccordionTrigger className="hover:no-underline">
                    <div className="flex items-center justify-between w-full pr-4">
                        <div className="flex items-center gap-3">
                            <div
                                {...(dragHandleProps || {})}
                                className="cursor-grab active:cursor-grabbing"
                            >
                                <GripVertical className="h-4 w-4 text-muted-foreground" />
                            </div>
                            <span className="font-semibold">{section.name}</span>
                            <span className="text-sm text-muted-foreground">
                                ({questions?.length || 0}{" "}
                                {questions?.length === 1 ? "question" : "questions"})
                            </span>
                            <SectionMarksDisplay questions={questions || []} />
                        </div>
                        <div className="flex gap-4" onClick={(e) => e.stopPropagation()}>
                            <div
                                role="button"
                                tabIndex={0}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onAddFromBank(section.id);
                                }}
                                onKeyDown={(e) => {
                                    if (e.key === "Enter" || e.key === " ") {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        onAddFromBank(section.id);
                                    }
                                }}
                                className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 border border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground h-9 px-3 cursor-pointer"
                            >
                                <Plus className="h-3 w-3" />
                                Add Question From Bank
                            </div>
                            <div
                                role="button"
                                tabIndex={0}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onAddQuestion(section.id);
                                }}
                                onKeyDown={(e) => {
                                    if (e.key === "Enter" || e.key === " ") {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        onAddQuestion(section.id);
                                    }
                                }}
                                className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 border border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground h-9 px-3 cursor-pointer"
                            >
                                <Plus className="h-3 w-3" />
                                Add Question to Section
                            </div>
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                                    <div
                                        role="button"
                                        tabIndex={0}
                                        className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 hover:bg-accent hover:text-accent-foreground h-9 w-9 p-0 cursor-pointer"
                                    >
                                        <MoreVertical className="h-4 w-4" />
                                        <span className="sr-only">Section menu</span>
                                    </div>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                    <DropdownMenuItem
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            onEdit(section.name);
                                        }}
                                    >
                                        <Edit2 className="h-4 w-4 mr-2" />
                                        Edit Section
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            onDelete(section.name, questions?.length || 0);
                                        }}
                                        className="text-destructive focus:text-destructive"
                                    >
                                        <Trash2 className="h-4 w-4 mr-2" />
                                        Delete Section
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </div>
                    </div>
                </AccordionTrigger>
                <AccordionContent>
                    <div className="space-y-6 pt-4">
                        {isLoading ? (
                            <p className="text-sm text-muted-foreground text-center py-4">
                                Loading questions...
                            </p>
                        ) : (
                            <QuestionList
                                sectionId={section.id}
                                questions={questions || []}
                                onEdit={handleEditQuestion}
                                onDelete={handleDeleteQuestion}
                            />
                        )}
                    </div>
                </AccordionContent>
            </AccordionItem>

            {/* Delete Question Dialog */}
            <ConfirmationDialog
                title="Remove Question"
                message="Are you sure you want to remove this question from the quiz?"
                onAccept={confirmDeleteQuestion}
                confirmButtonText="Remove"
                cancelButtonText="Cancel"
                isOpen={!!deletingQuestionId}
                onOpenChange={(open) => {
                    if (!open) setDeletingQuestionId(null);
                }}
            />
        </>
    );
}

function QuestionList({
    sectionId,
    questions,
    onEdit,
    onDelete,
}: {
    sectionId: string;
    questions: Question[];
    onEdit: (id: string) => void;
    onDelete: (id: string) => void;
}) {
    return (
        <Droppable droppableId={`questions-${sectionId}`} type="QUESTION">
            {(provided, snapshot) => (
                <div
                    {...provided.droppableProps}
                    ref={provided.innerRef}
                    className={`space-y-4 min-h-[100px] p-4 rounded-lg border-2 border-dashed transition-colors ${
                        snapshot.isDraggingOver
                            ? "bg-accent/50 border-primary"
                            : questions.length === 0
                              ? "border-muted-foreground/20"
                              : "border-transparent"
                    }`}
                >
                    {questions.length === 0 ? (
                        <div className="text-center py-8">
                            <p className="text-sm text-muted-foreground">
                                {snapshot.isDraggingOver
                                    ? "Drop question here"
                                    : "No questions in this section yet. Drag questions here or click 'Add Question to Section'."}
                            </p>
                        </div>
                    ) : (
                        questions.map((question, index) => {
                            if (!question || !question.id) return null;

                            const quizQuestionId = (question as QuestionWithQuizMetadata)
                                .quizQuestionId;

                            return (
                                <Draggable
                                    key={quizQuestionId}
                                    draggableId={quizQuestionId}
                                    index={index}
                                >
                                    {(provided, snapshot) => (
                                        <div
                                            ref={provided.innerRef}
                                            {...provided.draggableProps}
                                            className={snapshot.isDragging ? "opacity-50" : ""}
                                        >
                                            <div className="relative">
                                                <div
                                                    {...provided.dragHandleProps}
                                                    className="absolute left-0 top-4 cursor-grab active:cursor-grabbing p-2 hover:bg-accent rounded z-10"
                                                >
                                                    <GripVertical className="h-4 w-4 text-muted-foreground" />
                                                </div>
                                                <div className="pl-10">
                                                    <QuestionRender
                                                        question={question}
                                                        questionNumber={index + 1}
                                                        showMetadata={true}
                                                        showSolution={true}
                                                        showExplanation={true}
                                                        isReadOnly={true}
                                                        compareWithStudentAnswer={false}
                                                        onEdit={onEdit}
                                                        onDelete={onDelete}
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </Draggable>
                            );
                        })
                    )}
                    {provided.placeholder}
                </div>
            )}
        </Droppable>
    );
}

// Component to calculate and display total marks
function TotalMarksDisplay({
    sections,
    quizId,
    courseId,
}: {
    sections: { id: string; name: string }[];
    quizId: string;
    courseId: string;
}) {
    // Fetch questions for all sections using trpc.useQueries
    const sectionQueries = trpc.useQueries((t) =>
        sections.map((section) =>
            t.section.listQuestionsInSection({
                sectionId: section.id,
                quizId,
                courseId,
            })
        )
    );

    const totalMarks = useMemo(() => {
        let total = 0;
        sectionQueries.forEach((query) => {
            if (query.data) {
                query.data.forEach((question) => {
                    total += question.marks || 0;
                });
            }
        });
        return total;
    }, [sectionQueries]);

    const totalQuestions = useMemo(() => {
        let total = 0;
        sectionQueries.forEach((query) => {
            if (query.data) {
                total += query.data.length;
            }
        });
        return total;
    }, [sectionQueries]);

    const isLoading = sectionQueries.some((query) => query.isLoading);

    if (isLoading) {
        return <span className="text-muted-foreground">Calculating...</span>;
    }

    return (
        <span>
            {totalMarks} marks • {totalQuestions} {totalQuestions === 1 ? "question" : "questions"}
        </span>
    );
}

// Component to display section marks
function SectionMarksDisplay({ questions }: { questions: Question[] }) {
    const totalMarks = useMemo(() => {
        return questions.reduce((sum, question) => sum + (question.marks || 0), 0);
    }, [questions]);

    if (questions.length === 0) return null;

    return (
        <span className="text-sm font-medium text-primary ml-2">
            • {totalMarks} {totalMarks === 1 ? "mark" : "marks"}
        </span>
    );
}
