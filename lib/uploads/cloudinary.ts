import { v2 as cloudinary, type UploadApiResponse } from "cloudinary";

export function getCloudinaryConfig() {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;

  if (!cloudName || !apiKey || !apiSecret) {
    return null;
  }

  return {
    apiKey,
    apiSecret,
    cloudName,
  };
}

export function configureCloudinary() {
  const config = getCloudinaryConfig();

  if (!config) {
    return false;
  }

  cloudinary.config({
    api_key: config.apiKey,
    api_secret: config.apiSecret,
    cloud_name: config.cloudName,
    secure: true,
  });

  return true;
}

export function uploadImageBuffer(buffer: Buffer, folder: string): Promise<UploadApiResponse> {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: `recon-imports/admin/${folder}`,
        resource_type: "image",
        unique_filename: true,
        use_filename: true,
      },
      (error, result) => {
        if (error) {
          reject(error);
          return;
        }

        if (!result) {
          reject(new Error("Cloudinary did not return an upload result."));
          return;
        }

        resolve(result);
      },
    );

    uploadStream.end(buffer);
  });
}
