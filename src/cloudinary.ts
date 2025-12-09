import { v2 as cloudinary } from "cloudinary";

// check if envs are set
if (
  !Bun.env.CLOUDINARY_CLOUD_NAME ||
  !Bun.env.CLOUDINARY_API_KEY ||
  !Bun.env.CLOUDINARY_API_SECRET
) {
  throw new Error("Cloudinary envs are not set.");
}

// custom type for upload response 
interface UploadApiResponse {
  secure_url: string;
}

// set up cloudinary
cloudinary.config({
  cloud_name: Bun.env.CLOUDINARY_CLOUD_NAME,
  api_key: Bun.env.CLOUDINARY_API_KEY,
  api_secret: Bun.env.CLOUDINARY_API_SECRET,
});

export { UploadApiResponse, cloudinary };
