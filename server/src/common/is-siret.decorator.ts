import { registerDecorator, ValidationOptions } from 'class-validator';
import { isValidSiret } from './siret';

export function IsSiret(options?: ValidationOptions) {
  return (object: object, propertyName: string) => {
    registerDecorator({
      name: 'isSiret',
      target: object.constructor,
      propertyName,
      options,
      validator: {
        validate(value: unknown) {
          return typeof value === 'string' && isValidSiret(value);
        },
        defaultMessage: () => 'Le numéro de SIRET est invalide (échec de la clé de contrôle).',
      },
    });
  };
}
