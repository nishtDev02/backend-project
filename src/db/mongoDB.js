import mongoose from "mongoose";
import { DB_NAME } from "../constants.js";

const connectDB = async () => {
    try {
        const connectionInstance = await mongoose.connect(`mongodb+srv://nisht02:nishtkumar_12221@cluster0.hpbpi21.mongodb.net/${DB_NAME}`)
        console.log(`MongoDB Connected !! DB HOST: ${connectionInstance.connection.host}`)
    } catch (error) {
        console.log("MONGO DB Connection error: ", error);
        process.exit(1);
    }
}

export default connectDB;