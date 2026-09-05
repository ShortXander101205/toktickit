import multer from "multer";
import { Request, Response, NextFunction } from "express";
import {
  MAX_FILE_SIZE_BYTES,
  MAX_ACTIVE_ATTACHMENTS,
  ALLOWED_EXTENSIONS,
  ALLOWED_MIME_TYPES,
} from "../services/attachmentValidator.js";
import path from "path";

const storage = multer.memoryStorage();

const upload = multer({
  storage,
  limits: {
    fileSize: MAX_FILE_SIZE_BYTES,
    files: MAX_ACTIVE_ATTACHMENTS,
  },
  fileFilter: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const mime = file.mimetype.toLowerCase();

    if (!ALLOWED_EXTENSIONS.has(ext) || !ALLOWED_MIME_TYPES.has(mime)) {
      const error: any = new Error(
        `File '${file.originalname}' has an unsupported format. Allowed formats: JPG, PNG, WEBP, PDF.`
      );
      error.code = "UNSUPPORTED_MEDIA_TYPE";
      return cb(error);
    }

    cb(null, true);
  },
});

export const uploadAttachments = (req: Request, res: Response, next: NextFunction) => {
  upload.array("attachments", MAX_ACTIVE_ATTACHMENTS)(req, res, (err: any) => {
    if (err) {
      if (err instanceof multer.MulterError) {
        if (err.code === "LIMIT_FILE_SIZE") {
          return res.status(422).json({
            success: false,
            error: {
              code: "FILE_TOO_LARGE",
              message: "File exceeds the maximum allowed size of 5 MB (5,242,880 bytes).",
              details: [
                {
                  field: "attachments",
                  message: "Maximum size per file is 5 MB.",
                },
              ],
            },
          });
        }
        if (err.code === "LIMIT_FILE_COUNT") {
          return res.status(422).json({
            success: false,
            error: {
              code: "TOO_MANY_FILES",
              message: `Total active attachments cannot exceed ${MAX_ACTIVE_ATTACHMENTS} files.`,
              details: [
                {
                  field: "attachments",
                  message: `Maximum ${MAX_ACTIVE_ATTACHMENTS} attachments per ticket.`,
                },
              ],
            },
          });
        }
        return res.status(400).json({
          success: false,
          error: {
            code: "UPLOAD_ERROR",
            message: err.message,
            details: [],
          },
        });
      }

      if (err.code === "UNSUPPORTED_MEDIA_TYPE") {
        return res.status(415).json({
          success: false,
          error: {
            code: "UNSUPPORTED_MEDIA_TYPE",
            message: err.message,
            details: [
              {
                field: "attachments",
                message: "Invalid file type. Only JPG, PNG, WEBP, and PDF are accepted.",
              },
            ],
          },
        });
      }

      return res.status(400).json({
        success: false,
        error: {
          code: "UPLOAD_ERROR",
          message: err.message || "Failed to process uploaded file.",
          details: [],
        },
      });
    }

    next();
  });
};
