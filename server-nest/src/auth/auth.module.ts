import { Global, Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../database/entities/user.entity';
import { Client } from '../database/entities/client.entity';
import { JwtStrategy } from './jwt.strategy';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { AdminGuard } from './guards/admin.guard';
import { ClientGuard } from './guards/client.guard';
import { HashService } from './hash.service';
import { TokenService } from './token.service';

@Global()
@Module({
  imports: [
    PassportModule,
    TypeOrmModule.forFeature([User, Client]),
    JwtModule.registerAsync({
      useFactory: () => ({
        secret: process.env.JWT_SECRET,
        signOptions: { expiresIn: parseInt(process.env.JWT_TTL_MINUTES ?? '60', 10) * 60 },
      }),
    }),
  ],
  providers: [JwtStrategy, JwtAuthGuard, AdminGuard, ClientGuard, HashService, TokenService],
  exports: [JwtModule, TypeOrmModule, JwtAuthGuard, AdminGuard, ClientGuard, HashService, TokenService],
})
export class AuthModule {}
