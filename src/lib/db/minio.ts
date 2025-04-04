import { Client } from "minio";
import archiver from 'archiver';
import { Readable } from 'stream';

if (!process.env.MINIO_ACCESS_KEY ||
    !process.env.MINIO_SECRET_KEY ||
    !process.env.MINIO_ENDPOINT ||
    !process.env.MINIO_PORT) {
    throw new Error('MinIO environment variables are not set');
}

const minioClient = new Client({
    endPoint: `${process.env.MINIO_ENDPOINT}`,
    port: parseInt(`${process.env.MINIO_PORT}`, 10),
    useSSL: false,
    accessKey: `${process.env.MINIO_ACCESS_KEY}`,
    secretKey: `${process.env.MINIO_SECRET_KEY}`,
});

export async function uploadFile(file: Buffer, fileName: string, fileType?: string, bucketName?: string) {
    try {
        if (bucketName) {
            const bucketExists = await minioClient.bucketExists(bucketName);
            if (!bucketExists) {
                await minioClient.makeBucket(bucketName, 'us-east-1');
            }
        }

        await minioClient.putObject(bucketName || '', fileName, file, undefined, {
            "Content-Type": fileType || 'application/octet-stream',
        });

        const url = `http://${process.env.MINIO_ENDPOINT}:${process.env.MINIO_PORT}/${bucketName || ''}/${fileName}`;
        return url;
    } catch (error) {
        console.log('Error uploading to MinIO:', error);
        throw error;
    }
}

export async function uploadImage(file: Buffer, fileName: string, fileType: string): Promise<string> {
    try {
        const bucketName = 'evalify';
        const bucketExists = await minioClient.bucketExists(bucketName);
        if (!bucketExists) {
            await minioClient.makeBucket(bucketName, 'us-east-1');
        }

        await minioClient.putObject(bucketName, fileName, file, undefined, {
            'Content-Type': fileType,
            'Cache-Control': 'max-age=31536000',
        });

        const url = `http://${process.env.MINIO_ENDPOINT}:${process.env.MINIO_PORT}/${bucketName}/${fileName}`;
        return url;
    } catch (error) {
        console.log('Error uploading image:', error);
        throw error;
    }
}

export async function uploadQuestionImage(file: Buffer, fileName: string, fileType: string): Promise<string> {
    try {
        const bucketName = 'questions';
        const bucketExists = await minioClient.bucketExists(bucketName);
        if (!bucketExists) {
            await minioClient.makeBucket(bucketName, 'us-east-1');
        }

        await minioClient.putObject(bucketName, fileName, file, undefined, {
            'Content-Type': fileType,
            'Cache-Control': 'max-age=31536000',
        });

        const url = `http://${process.env.MINIO_ENDPOINT}:${process.env.MINIO_PORT}/${bucketName}/${fileName}`;
        return url;
    } catch (error) {
        console.log('Error uploading question image:', error);
        throw error;
    }
}

export async function uploadQuizFile(file: Buffer, fileName: string, fileType: string): Promise<string> {
    try {
        const bucketName = 'quiz-files';
        const bucketExists = await minioClient.bucketExists(bucketName);
        if (!bucketExists) {
            await minioClient.makeBucket(bucketName, 'us-east-1');
        }

        await minioClient.putObject(bucketName, fileName, file, undefined, {
            'Content-Type': fileType,
            'Cache-Control': 'max-age=31536000',
        });

        const url = `http://${process.env.MINIO_ENDPOINT}:${process.env.MINIO_PORT}/${bucketName}/${fileName}`;
        return url;
    } catch (error) {
        console.log('Error uploading quiz file:', error);
        throw error;
    }
}

export async function uploadQuizSubmission(
    file: Buffer, 
    quizId: string, 
    questionId: string, 
    rollNo: string, 
    fileType: string,
    originalFilename: string
): Promise<{url: string, fileInfo: any}> {
    try {
        if (file.length > 10 * 1024 * 1024) {
            throw new Error('File size must be less than 10MB');
        }

        const bucketName = 'quiz-submissions';
        const bucketExists = await minioClient.bucketExists(bucketName);
        if (!bucketExists) {
            await minioClient.makeBucket(bucketName, 'us-east-1');
        }

        // Preserve original file extension
        const fileExtension = originalFilename.split('.').pop() || 'file';
        const fileName = `${quizId}/${questionId}/${rollNo}_${questionId}.${fileExtension}`;

        // Set appropriate Content-Type and Content-Disposition
        const metadata = {
            'Content-Type': fileType,
            'Content-Disposition': `attachment; filename="${originalFilename}"`,
            'X-Original-Filename': originalFilename,
        };

        await minioClient.putObject(bucketName, fileName, file, undefined, metadata);

        const url = `http://${process.env.MINIO_ENDPOINT}:${process.env.MINIO_PORT}/${bucketName}/${fileName}`;
        
        const fileInfo = {
            name: originalFilename,
            size: file.length,
            type: fileType,
            url: url
        };

        return { url, fileInfo };
    } catch (error) {
        console.error('Error uploading quiz submission:', error);
        throw error;
    }
}

export async function listFiles(bucketName: string, prefix: string = '') {
    try {
        const bucketExists = await minioClient.bucketExists(bucketName);
        if (!bucketExists) {
            await minioClient.makeBucket(bucketName, 'us-east-1');
            return [];
        }

        const stream = minioClient.listObjects(bucketName, prefix, true);
        const files: { name: string; size: number; lastModified: Date; isFolder: boolean }[] = [];


        for await (const item of stream) {
            // Handle folders (objects ending with /)
            if (item.name.endsWith('/')) {
                files.push({
                    name: item.name.slice(0, -1),
                    size: 0,
                    lastModified: item.lastModified,
                    isFolder: true
                });
                continue;
            }

            // Add regular files
            files.push({
                name: item.name,
                size: item.size,
                lastModified: item.lastModified,
                isFolder: false
            });
        }
        return files;
    } catch (error) {
        console.log('Error listing files:', error);
        throw error;
    }
}

export async function deleteFile(fileName: string, bucketName: string) {
    try {
        const bucketExists = await minioClient.bucketExists(bucketName);
        if (!bucketExists) {
            throw new Error('Bucket does not exist');
        }
        await minioClient.removeObject(bucketName, fileName);
    } catch (error) {
        console.log('Error deleting from MinIO:', error);
        throw error;
    }
}

export async function deleteQuizSubmission(quizId: string, questionId: string, rollNo: string) {
    try {
        const bucketName = 'quiz-submissions';
        // List all files in the question directory to find the exact file
        const stream = minioClient.listObjects(bucketName, `${quizId}/${questionId}/`, true);
        
        for await (const file of stream) {
            if (file.name.includes(rollNo)) {
                await minioClient.removeObject(bucketName, file.name);
                break;
            }
        }
    } catch (error) {
        console.error('Error deleting quiz submission:', error);
        throw error;
    }
}

export function sanitizeBucketName(name: string): string {
    return name
        .toLowerCase()
        .replace(/[^a-z0-9.-]/g, '-')
        .replace(/^-+|-+$/g, '')
        .substring(0, 63);
}

export function sanitizeFolderName(name: string): string {
    // Remove leading/trailing slashes and spaces
    name = name.trim().replace(/^\/+|\/+$/g, '');
    // Replace multiple slashes with single slash
    name = name.replace(/\/+/g, '/');
    // Replace invalid characters with dash
    name = name.replace(/[^a-zA-Z0-9-._/]/g, '-');
    return name;
}

export async function createFolder(folderName: string, bucketName: string) {
    try {
        const bucketExists = await minioClient.bucketExists(bucketName);
        if (!bucketExists) {
            throw new Error('Bucket does not exist');
        }

        // Sanitize folder name
        const sanitizedName = sanitizeFolderName(folderName);
        if (!sanitizedName) {
            throw new Error('Invalid folder name');
        }

        // Ensure folder name ends with slash
        const folderPath = sanitizedName.endsWith('/') ? sanitizedName : `${sanitizedName}/`;

        // Create an empty object with folder name
        await minioClient.putObject(bucketName, folderPath, Buffer.from(''));
        return true;
    } catch (error) {
        console.log('Error creating folder:', error);
        throw error;
    }
}

export async function moveFile(oldPath: string, newPath: string, bucketName: string) {
    try {
        // Use the correct source format (just oldPath instead of bucketName/oldPath)
        await minioClient.copyObject(bucketName, newPath, `/${bucketName}/${oldPath}`);
        // Delete from old location
        await minioClient.removeObject(bucketName, oldPath);
        return true;
    } catch (error) {
        console.log('Error moving file:', error);
        throw error;
    }
}

export async function downloadFolder(folderPath: string, bucketName: string): Promise<Readable> {
    try {
        const archive = archiver('zip', {
            zlib: { level: 9 }
        });

        const stream = minioClient.listObjects(bucketName, folderPath, true);

        for await (const file of stream) {
            if (!file.name.endsWith('/')) {  // Skip folder objects
                const fileData = await minioClient.getObject(bucketName, file.name);
                const relativePath = file.name.slice(folderPath.length + 1);
                archive.append(fileData, { name: relativePath });
            }
        }

        archive.finalize();
        return archive;
    } catch (error) {
        console.log('Error creating folder zip:', error);
        throw error;
    }
}

export async function downloadFile(fileName: string, bucketName: string): Promise<Readable> {
    try {
        const bucketExists = await minioClient.bucketExists(bucketName);
        if (!bucketExists) {
            throw new Error('Bucket does not exist');
        }

        return await minioClient.getObject(bucketName, fileName);
    } catch (error) {
        console.log('Error downloading file:', error);
        throw error;
    }
}

export default minioClient;
