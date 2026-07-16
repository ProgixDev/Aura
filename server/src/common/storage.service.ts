import { Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { extname } from 'path';
import { randomUUID } from 'crypto';

@Injectable()
export class StorageService {
  private readonly supabase: SupabaseClient;
  private readonly bucket = process.env.SUPABASE_STORAGE_BUCKET ?? 'aura-uploads';

  constructor() {
    this.supabase = createClient(process.env.SUPABASE_URL ?? '', process.env.SUPABASE_SERVICE_ROLE_KEY ?? '');
  }

  async save(file: Express.Multer.File, subdir: string): Promise<string> {
    // The object key is derived entirely from a random id + a sanitized extension.
    // `file.originalname` is fully attacker-controlled (client Content-Disposition header)
    // and must never be interpolated into the stored key. The original filename is
    // preserved separately as a display-only DB value (see PraticienDocument.nom_fichier).
    const ext = extname(file.originalname).toLowerCase().replace(/[^a-z0-9.]/g, '');
    const name = `${randomUUID()}${ext}`;
    const objectKey = `${subdir}/${name}`;
    const { error } = await this.supabase.storage.from(this.bucket).upload(objectKey, file.buffer, {
      contentType: file.mimetype,
    });
    if (error) throw new InternalServerErrorException(error.message);
    return objectKey;
  }

  /** Fetches a stored `chemin` (as returned by `save()`) back from Supabase Storage. */
  async download(chemin: string): Promise<Buffer> {
    const { data, error } = await this.supabase.storage.from(this.bucket).download(chemin);
    if (error || !data) throw new NotFoundException('Fichier introuvable');
    return Buffer.from(await data.arrayBuffer());
  }
}
