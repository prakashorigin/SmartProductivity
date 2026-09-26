import mongoose from "mongoose";
import { env } from "./env.js";

export const connectDatabase = async (): Promise<void> => {
  if (!env.mongoUri) {
    throw new Error("MONGO_URI is missing. Set a local MongoDB or MongoDB Atlas URI in backend/.env.");
  }

  mongoose.connection.on("disconnected", () => {
    console.warn("MongoDB connection was lost; Mongoose will attempt to reconnect.");
  });
  mongoose.connection.on("error", (error: Error) => {
    console.error(`MongoDB connection error (${error.name}).`);
  });

  try {
    await mongoose.connect(env.mongoUri, { serverSelectionTimeoutMS: 10_000, maxPoolSize: 10 });
    console.log(`MongoDB connected (${mongoose.connection.name}).`);
  } catch (error) {
    const cause = error instanceof Error ? error : new Error("Unknown database connection error");
    const message = cause.name === "MongooseServerSelectionError"
      ? "MongoDB could not be reached. Start the local MongoDB server or check the Atlas URI and network access list."
      : "MongoDB connection failed. Check the URI, credentials, and database permissions.";
    throw new Error(message, { cause });
  }
};

export const disconnectDatabase = async (): Promise<void> => {
  await mongoose.disconnect();
};
