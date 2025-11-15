"use client";

import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { DragDropContext, Droppable, Draggable, type DropResult } from "@hello-pangea/dnd";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from "@/components/ui/accordion";
import { Plus, Edit2, Trash2, GripVertical, MoreVertical } from "lucide-react";
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
    const [addFromBankOpen, setAddFromBankOpen] = useState(false);
    const [selectedSectionForBank, setSelectedSectionForBank] = useState<string | undefined>(
        undefined
    );

    const utils = trpc.useUtils();

    // Fetch sections
    const { data: sections, isLoading: sectionsLoading } = trpc.section.listByQuiz.useQuery({
        quizId,
        courseId,
    });

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
                    <div className="flex justify-between items-center">
                        <div>
                            <h1 className="text-2xl sm:text-3xl font-bold">Quiz Questions</h1>
                            <p className="text-sm text-muted-foreground mt-1">
                                Manage sections and questions for this quiz
                            </p>
                        </div>
                        <div className="flex gap-2">
                            <Button
                                variant="outline"
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
                                                            onDelete={() =>
                                                                setDeletingSectionId(section.id)
                                                            }
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
                    message="Are you sure you want to delete this section? Questions in this section will be moved to unsectioned questions."
                    confirmButtonText="Delete"
                    cancelButtonText="Cancel"
                />

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
    onDelete: () => void;
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
                                            onDelete();
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
