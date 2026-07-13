import { UnprocessableEntityException } from '@nestjs/common';

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
  if (file.size > maxKb * 1024) {
    errors[field] = [`Le fichier ne doit pas dépasser ${maxKb} Ko.`];
  } else if (!allowedMimes.includes(file.mimetype)) {
    errors[field] = [`Type de fichier invalide (attendu: ${allowedExts.join(', ')}).`];
  }
  if (Object.keys(errors).length) {
    throw new UnprocessableEntityException({
      status: 'error', message: 'Erreur de validation', errors,
    });
  }
}
