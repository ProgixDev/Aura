import { Injectable } from '@nestjs/common';
import { promises as fs } from 'fs';
import { join } from 'path';

@Injectable()
export class StorageService {
  private readonly base = process.env.UPLOAD_DIR ?? join(process.cwd(), 'storage', 'uploads');

  async save(file: Express.Multer.File, subdir: string): Promise<string> {
    const dir = join(this.base, subdir);
    await fs.mkdir(dir, { recursive: true });
    const name = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${file.originalname}`;
    await fs.writeFile(join(dir, name), file.buffer);
    return `${subdir}/${name}`;
  }
}
