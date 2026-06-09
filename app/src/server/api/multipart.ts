import multer from 'multer';
import {
  ALLOWED_MIME_TYPES,
  MAX_FILE_SIZE_BYTES,
} from '../storage/uploadValidation';

/** In-memory storage — files go to Bunny/local via documentStorage, not disk. */
export const documentUploadMulter = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_SIZE_BYTES, files: 1 },
  fileFilter: (_req, file, cb) => {
    if ((ALLOWED_MIME_TYPES as readonly string[]).includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Formato de ficheiro não permitido. Use JPG, PNG, WebP ou PDF.'));
    }
  },
});

export const singleDocumentUpload = documentUploadMulter.single('file');
