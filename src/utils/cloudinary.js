import { v2 as cloudinary } from "cloudinary";
import fs from "fs";
import path from "path";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

//   nansole.log({
// me: process.env.CLOUDINARY_CLOUD_NAME,
//   key: process.env.CLOUDINARY_API_KEY,
//   secret: process.env.CLOUDINARY_API_SECRET,
// });co

const uploadOnCloudinary = async (localFilePath) => {
  try {
    if (!localFilePath) return null;

    // normalize path for all OS
    const normalizedPath = path.resolve(localFilePath);

    // upload file on cloudinary
    const response = await cloudinary.uploader.upload(normalizedPath, {
      resource_type: "auto",
    });

    // file has been uploaded successfully
    // console.log("file is uploaded on cloudinary ", response.url);
    fs.unlinkSync(localFilePath)

    return response;
  } catch (error) {
    console.log("Cloudinary upload failed: ", error.message);

    // safe delete
    if (fs.existsSync(localFilePath)) {
      fs.unlinkSync(localFilePath); // remove the locally saved temporary file as the upload operation failed
    }
    return null;
  }
};

export { uploadOnCloudinary };
