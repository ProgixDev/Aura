import { PartialType } from '@nestjs/mapped-types';
import { CreateCercleDto } from './create-cercle.dto';

export class UpdateCercleDto extends PartialType(CreateCercleDto) {}
