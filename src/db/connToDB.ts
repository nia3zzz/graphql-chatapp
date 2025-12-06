import { connect } from "mongoose";

const mongodbURI = Bun.env.MONGODB_URI;

if (!mongodbURI) {
  throw new Error("MONGODB_URI is not defined");
}

const connectToDB = async () => {
  try {
    await connect(mongodbURI);
    console.log("Connected to MongoDB");
  } catch (error) {
    console.error("Error connecting to MongoDB:", error);
  }
};

export default connectToDB;
