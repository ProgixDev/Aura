import {
  registerDecorator, ValidationArguments, ValidationOptions,
} from 'class-validator';

export function Match(property: string, options?: ValidationOptions) {
  return (object: object, propertyName: string) => {
    registerDecorator({
      name: 'match',
      target: object.constructor,
      propertyName,
      constraints: [property],
      options,
      validator: {
        validate(value: unknown, args: ValidationArguments) {
          return value === (args.object as Record<string, unknown>)[args.constraints[0]];
        },
        defaultMessage: (args: ValidationArguments) =>
          `${args.property} ne correspond pas à ${args.constraints[0]}`,
      },
    });
  };
}
