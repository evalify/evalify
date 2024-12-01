import { Client } from "minio";

if (!process.env.MINIO_ACCESS_KEY ||
    !process.env.MINIO_SECRET_KEY ||
    !process.env.MINIO_ENDPOINT ||
    !process.env.MINIO_PORT) {
    throw new Error('MinIO environment variables are not set');
}

const minioClient = new Client({
    endPoint: `${process.env.MINIO_ENDPOINT}`,
    port: parseInt(`${process.env.MINIO_PORT}`, 10),
    useSSL: false, // Set to true if your MinIO uses HTTPS
    accessKey: `${process.env.MINIO_ACCESS_KEY}`,
    secretKey: `${process.env.MINIO_SECRET_KEY}`,
});

export async function uploadFile(file: Buffer, fileName: string, fileType: string) {
    const bucketName = 'profile-pics';

    try {
        // Ensure bucket exists
        const bucketExists = await minioClient.bucketExists(bucketName);
        if (!bucketExists) {
            await minioClient.makeBucket(bucketName, 'us-east-1');
        }

        // Upload file
        await minioClient.putObject(bucketName, fileName, file, undefined, {
            "Content-Type": fileType,
        });

        // Generate URL
        const url = `http://${process.env.MINIO_ENDPOINT}:${process.env.MINIO_PORT}/${bucketName}/${fileName}`;
        return url;
    } catch (error) {
        console.error('Error uploading to MinIO:', error);
        throw error;
    }
}

export async function deleteFile(fileName: string) {
    const bucketName = 'profile-pics';
    try {
        await minioClient.removeObject(bucketName, fileName);
    } catch (error) {
        console.error('Error deleting from MinIO:', error);
        throw error;
    }
}

export default minioClient;
