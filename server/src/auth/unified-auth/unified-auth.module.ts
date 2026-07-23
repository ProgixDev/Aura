import { Module } from '@nestjs/common';
import { UnifiedAuthController } from './unified-auth.controller';
import { UnifiedAuthService } from './unified-auth.service';

@Module({ controllers: [UnifiedAuthController], providers: [UnifiedAuthService] })
export class UnifiedAuthModule {}
