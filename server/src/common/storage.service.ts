import { Injectable } from '@nestjs/common';
import { promises as fs } from 'fs';
import { join, extname } from 'path';
import { randomUUID } from 'crypto';

@Injectable()
export class StorageService {
  private readonly base = process.env.UPLOAD_DIR ?? join(process.cwd(), 'storage', 'uploads');

  async save(file: Express.Multer.File, subdir: string): Promise<string> {
    const dir = join(this.base, subdir);
    await fs.mkdir(dir, { recursive: true });
    // The on-disk filename is derived entirely from a random id + a sanitized
    // extension. `file.originalname` is fully attacker-controlled (client
    // Content-Disposition header) and must never be interpolated into the
    // actual filesystem path (path traversal via `../` sequences). The
    // original filename is preserved separately as a display-only DB value
    // (see PraticienDocument.nom_fichier).
    const ext = extname(file.originalname).toLowerCase().replace(/[^a-z0-9.]/g, '');
    const name = `${randomUUID()}${ext}`;
    await fs.writeFile(join(dir, name), file.buffer);
    return `${subdir}/${name}`;
  }

  /** Turns a stored `chemin` (as returned by `save()`) into an absolute filesystem path. */
  resolve(chemin: string): string {
    return join(this.base, chemin);
  }
}
