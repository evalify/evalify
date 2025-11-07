export interface Bank {
    id: string;
    name: string;
    courseCode: string | null;
    semester: number;
    createdById: string | null;
    createdAt: Date;
    updatedAt: Date;
    creator?: {
        id: string;
        name: string;
        email: string;
    };
}

export interface BankUser {
    id: string;
    bankId: string;
    userId: string;
    accessLevel: "READ" | "WRITE" | "OWNER";
    createdAt: Date;
    updatedAt: Date;
    user?: {
        id: string;
        name: string;
        email: string;
        role: string;
    };
}

export interface BankWithAccess extends Bank {
    accessLevel: "READ" | "WRITE" | "OWNER";
    sharedUsers?: BankUser[];
}

export interface BankListItem {
    id: string;
    name: string;
    courseCode: string | null;
    semester: number;
    createdAt: Date;
    updatedAt: Date | null;
    creator: {
        id: string;
        name: string;
        email: string;
    } | null;
    accessLevel: "READ" | "WRITE" | "OWNER";
    sharedCount: number;
}
