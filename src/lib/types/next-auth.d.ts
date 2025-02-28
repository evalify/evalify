import { User } from "next-auth"
import { JWT } from "next-auth/jwt"

type UserRole = "STUDENT" | "STAFF" | "ADMIN" | "MANAGER"

interface IUser extends User {
    id: string
    name: string
    email: string
    role: UserRole
    rollNo: string
    phoneNo?: string
    image?: string
    isActive: boolean
    createdAt: Date
    lastPasswordChange: Date
    classId?: string
}

declare module "next-auth" {
    interface Session {
        user: IUser
    }
}

declare module "next-auth/jwt" {
    interface JWT {
        user: IUser
    }
}
