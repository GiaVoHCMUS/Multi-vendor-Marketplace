import cloudinary from "@/core/config/cloudinary";
import { UploadApiErrorResponse, UploadApiResponse } from "cloudinary";
import { ImageType } from "../types/image.type";

export const imageService = {
  // Upload single image
  async uploadSingle(
    fileBuffer: Buffer,
    folder: string
  ): Promise<ImageType> {
    return new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        { folder },
        (error?: UploadApiErrorResponse, result?: UploadApiResponse) => {
          if (error) return reject(error);

          resolve({
            url: result?.secure_url || "",
            publicId: result?.public_id || "",
          });
        }
      );

      stream.end(fileBuffer);
    });
  },

  // Upload multiple images
  async uploadMultiple(
    files: Express.Multer.File[],
    folder: string
  ): Promise<ImageType[]> {
    const uploads = files.map((file) =>
      imageService.uploadSingle(file.buffer, folder)
    );

    return Promise.all(uploads);
  },

  // Delete single image
  async delete(publicId: string): Promise<void> {
    if (!publicId) return;

    await cloudinary.uploader.destroy(publicId);
  },

  // Delete multiple images
  async deleteMultiple(publicIds: string[]): Promise<void> {
    if (!publicIds.length) return;

    await Promise.all(
      publicIds.map((id) => cloudinary.uploader.destroy(id))
    );
  },

  // Replace image (delete old + upload new)
  async replace(
    fileBuffer: Buffer,
    folder: string,
    oldPublicId?: string
  ): Promise<ImageType> {
    // Upload trước để đảm bảo có ảnh mới rồi mới xóa ảnh cũ
    const newImage = await imageService.uploadSingle(fileBuffer, folder);

    if (oldPublicId) {
      await imageService.delete(oldPublicId);
    }

    return newImage;
  },
}