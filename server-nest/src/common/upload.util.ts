import { UnprocessableEntityException } from '@nestjs/common';
import { extname } from 'path';

const MIME_BY_EXT: Record<string, string[]> = {
  jpg: ['image/jpeg'], jpeg: ['image/jpeg'], png: ['image/png'], gif: ['image/gif'],
  pdf: ['application/pdf'],
  doc: ['application/msword'],
  docx: ['application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
};

export function assertUpload(
  file: Express.Multer.File,
  field: string,
  allowedExts: string[],
  maxKb = 5120,
) {
  const errors: Record<string, string[]> = {};
  const allowedMimes = allowedExts.flatMap((e) => MIME_BY_EXT[e] ?? []);
  const actualExt = extname(file.originalname).toLowerCase().replace(/^\./, '');
  if (file.size > maxKb * 1024) {
    errors[field] = [`Le fichier ne doit pas dépasser ${maxKb} Ko.`];
  } else if (!allowedMimes.includes(file.mimetype) || !allowedExts.includes(actualExt)) {
    // Client-supplied mimetype is spoofable (just an echoed header), so the
    // real file extension must also match the allowed list — both checks
    // must pass.
    errors[field] = [`Type de fichier invalide (attendu: ${allowedExts.join(', ')}).`];
  }
  if (Object.keys(errors).length) {
    throw new UnprocessableEntityException({
      status: 'error', message: 'Erreur de validation', errors,
    });
  }
}
