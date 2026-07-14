import { Transform } from 'class-transformer';
import { IsBoolean, IsOptional } from 'class-validator';

// NB: the global ValidationPipe has transformOptions.enableImplicitConversion: true (see
// src/common/validation.ts), which for a reflected `boolean` property coerces ANY provided
// value via `Boolean(value)` (so e.g. the string 'yes' becomes `true`) *before* @IsBoolean()
// runs — meaning invalid non-boolean input would silently pass validation instead of 422ing.
// Re-reading the raw value straight off the source object sidesteps that implicit coercion so
// @IsBoolean() sees what was actually sent.
const rawBoolean = ({ obj, key }: { obj: any; key: string }) => obj[key];

export class UpdateNotificationPreferencesDto {
  @IsOptional() @Transform(rawBoolean) @IsBoolean() rappels_seance?: boolean;
  @IsOptional() @Transform(rawBoolean) @IsBoolean() nouveaux_messages?: boolean;
  @IsOptional() @Transform(rawBoolean) @IsBoolean() reponses_avis?: boolean;
  @IsOptional() @Transform(rawBoolean) @IsBoolean() newsletter?: boolean;
}
