export interface CourseInstructorPreviewDTO {
    id: string;
    name: string;
    courseCode: string;
    description: string;
    quizzes: number;
    semester: CourseInstructorSemesterDTO;
}

export interface CourseInstructorSemesterDTO {
    id: string;
    name: string;
    year: number;
}

export interface StudentDTO {
    id: string | null;
    name: string;
    email: string;
    profileId: string | null;
    batchId: string | null;
}

export interface CourseStudentInstructorDTO {
    courseId: string;
    courseName: string;
    courseCode: string;
    students: StudentDTO[];
}

export interface CourseStudentInstructorDetailsDTO {
    id: string | null;
    name: string;
    email: string;
    phoneNumber: string;
    image: string | null;
    batch: string | null;
}

export interface LabResponse {
    id: string;
    name: string;
    block?: string;
    ipSubnet: string;
    isActive: string;
}

export interface BatchResponse {
    id: string;
    name: string;
    graduationYear: number;
    departmentId: string;
    section: string;
    isActive: string;
    joinYear: number;
}

export interface QuizParticipantData {
    students: string[];
    courses: string[];
    labs: string[];
    batches: string[];
}

// Internal types for component state
export interface StudentWithBatch {
    id: string;
    name: string;
    email: string;
    batchId: string;
}

export interface StudentInMap {
    id: string;
    name: string;
    email: string;
}
