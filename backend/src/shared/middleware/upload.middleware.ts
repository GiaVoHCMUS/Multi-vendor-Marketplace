import multer from 'multer';
import { Request} from 'express';
import path from 'path';
import { AppError } from '../utils/AppError';

const storage = multer.memoryStorage();
const fileFilter = (
  req: Request,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback,
) => {
  const filetypes = /jpeg|jpg|png|gif/;
  const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = filetypes.test(file.mimetype);
  if (mimetype && extname) {
    return cb(null, true);
  } else {
    cb(new AppError('Chỉ chấp nhận file ảnh (jpg, png, gif)!', 400));
  }
};

const multerUpload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024,
  },
});

export const upload = {
  single: (fieldName: string) => {
    return multerUpload.single(fieldName);
  },
  array: (fieldName: string, maxCount: number) => {
    return multerUpload.array(fieldName, maxCount);
  },
};