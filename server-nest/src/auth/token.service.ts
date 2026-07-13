import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { User } from '../database/entities/user.entity';

@Injectable()
export class TokenService {
  constructor(private readonly jwt: JwtService) {}

  ttlSeconds(): number {
    return parseInt(process.env.JWT_TTL_MINUTES ?? '60', 10) * 60;
  }

  sign(user: User): string {
    return this.jwt.sign(
      { user_id: user.id, email: user.email, is_admin: user.is_admin },
      { subject: String(user.id) },
    );
  }

  tokenPayload(user: User) {
    return { token: this.sign(user), token_type: 'bearer', expires_in: this.ttlSeconds() };
  }
}
