import { Global, Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../database/entities/user.entity';
import { Client } from '../database/entities/client.entity';
import { Praticien } from '../database/entities/praticien.entity';
import { JwtStrategy } from './jwt.strategy';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { AdminGuard } from './guards/admin.guard';
import { ClientGuard } from './guards/client.guard';
import { PraticienGuard } from './guards/praticien.guard';
import { OptionalJwtGuard } from './guards/optional-jwt.guard';
import { CapabilityGuard } from './guards/capability.guard';
import { HashService } from './hash.service';
import { TokenService } from './token.service';

@Global()
@Module({
  imports: [
    PassportModule,
    TypeOrmModule.forFeature([User, Client, Praticien]),
    JwtModule.registerAsync({
      useFactory: () => ({
        secret: process.env.JWT_SECRET,
        signOptions: { expiresIn: parseInt(process.env.JWT_TTL_MINUTES ?? '60', 10) * 60 },
      }),
    }),
  ],
  providers: [
    JwtStrategy, JwtAuthGuard, AdminGuard, ClientGuard, PraticienGuard,
    OptionalJwtGuard, CapabilityGuard, HashService, TokenService,
  ],
  exports: [
    JwtModule, TypeOrmModule, JwtAuthGuard, AdminGuard, ClientGuard, PraticienGuard,
    OptionalJwtGuard, CapabilityGuard, HashService, TokenService,
  ],
})
export class AuthModule {}
