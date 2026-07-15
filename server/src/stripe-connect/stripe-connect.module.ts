import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Praticien } from '../database/entities/praticien.entity';
import { StripeConnectController } from './stripe-connect.controller';
import { StripeConnectService } from './stripe-connect.service';
import { StripeService } from '../common/stripe.service';

@Module({
  imports: [TypeOrmModule.forFeature([Praticien])],
  controllers: [StripeConnectController],
  providers: [StripeConnectService, StripeService],
  exports: [StripeConnectService],
})
export class StripeConnectModule {}
