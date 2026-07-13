import { Injectable } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';

@Injectable()
export class HashService {
  hash(plain: string): Promise<string> {
    return bcrypt.hash(plain, 12);
  }
  // bcryptjs accepts Laravel's $2y$ prefix, so existing hashes keep working.
  compare(plain: string, hashed: string): Promise<boolean> {
    return bcrypt.compare(plain, hashed);
  }
}
