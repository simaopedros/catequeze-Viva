import multer from "multer";
import {
  ALLOWED_MIME_TYPES,
  MAX_FILE_SIZE_BYTES,
} from "../storage/uploadValidation";
import {
  MAX_SOCIAL_IMAGE_BYTES,
  MAX_SOCIAL_VIDEO_BYTES,
  SOCIAL_IMAGE_MIME_TYPES,
  SOCIAL_VIDEO_MIME_TYPES,
} from "../storage/socialMediaStorage";

/** In-memory storage — files go to Bunny/local via documentStorage, not disk. */
export const documentUploadMulter = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_SIZE_BYTES, files: 1 },
  fileFilter: (_req, file, cb) => {
    if ((ALLOWED_MIME_TYPES as readonly string[]).includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(
        new Error(
          "Formato de ficheiro não permitido. Use JPG, PNG, WebP ou PDF.",
        ),
      );
    }
  },
});

export const singleDocumentUpload = documentUploadMulter.single("file");

/** Comunidade feed images — larger cap than documents, images only. */
export const socialImageUploadMulter = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_SOCIAL_IMAGE_BYTES, files: 1 },
  fileFilter: (_req, file, cb) => {
    if (
      (SOCIAL_IMAGE_MIME_TYPES as readonly string[]).includes(file.mimetype)
    ) {
      cb(null, true);
    } else {
      cb(new Error("Formato não permitido. Use JPG, PNG ou WebP."));
    }
  },
});

export const singleSocialImageUpload = socialImageUploadMulter.single("file");

/** Comunidade videos stored on Bunny Storage / disk when Stream is off. */
export const socialVideoUploadMulter = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_SOCIAL_VIDEO_BYTES, files: 1 },
  fileFilter: (_req, file, cb) => {
    if (
      (SOCIAL_VIDEO_MIME_TYPES as readonly string[]).includes(file.mimetype)
    ) {
      cb(null, true);
    } else {
      cb(new Error("Formato não permitido. Use MP4, WebM ou MOV."));
    }
  },
});

export const singleSocialVideoUpload = socialVideoUploadMulter.single("file");
