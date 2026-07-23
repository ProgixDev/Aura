import { Module } from '@nestjs/common';
import { ClientAuthController } from './client-auth.controller';
import { ClientAuthService } from './client-auth.service';
import { StorageService } from '../../common/storage.service';

@Module({ controllers: [ClientAuthController], providers: [ClientAuthService, StorageService] })
export class ClientAuthModule {}
