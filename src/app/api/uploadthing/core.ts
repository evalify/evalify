import { createUploadthing, type FileRouter } from "uploadthing/next";
import { auth } from "@/lib/auth/auth";

const f = createUploadthing();

export const ourFileRouter = {
    // Define as many FileRoutes as you like, each with a unique routeSlug
    quizFileUploader: f({ pdf: { maxFileSize: "4MB" }, text: { maxFileSize: "4MB" }, image: { maxFileSize: "4MB" } })
        .middleware(async () => {
            const session = await auth();
            if (!session?.user) throw new Error("Unauthorized");

            return { userId: session.user.id };
        })
        .onUploadComplete(async ({ metadata, file }) => {
            return { url: file.url };
        }),
} satisfies FileRouter;

export type OurFileRouter = typeof ourFileRouter;
