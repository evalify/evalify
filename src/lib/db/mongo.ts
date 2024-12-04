import { MongoClient, MongoClientOptions } from "mongodb";

const URI: string | undefined = process.env.MONGODB_URI;
if (!URI) {
    throw new Error("Please define the MONGODB_URI environment variable inside .env");
}

const options: MongoClientOptions = {
    useUnifiedTopology: true,
    maxPoolSize: 120,
    minPoolSize: 40,
    connectTimeoutMS: 5000,
    socketTimeoutMS: 30000,
    serverSelectionTimeoutMS: 5000,
    retryWrites: true,
    retryReads: true,
};

let client: MongoClient = new MongoClient(
    URI,
    options
);
let clientPromise: Promise<MongoClient>;


if (process.env.NODE_ENV === "development") {
    if (!(global as any)._mongoClientPromise) {
        (global as any)._mongoClientPromise = client.connect();
    }
    clientPromise = (global as any)._mongoClientPromise;
} else {
    clientPromise = client.connect();
}

export default clientPromise;
