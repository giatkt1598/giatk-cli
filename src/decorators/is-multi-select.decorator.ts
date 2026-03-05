import { Transform } from "class-transformer";
import { getMetadataStorage, registerDecorator, type ValidationArguments } from "class-validator";

function hasIsOptionalDecorator(args: ValidationArguments): boolean {
  return getMetadataStorage()
    .getTargetValidationMetadatas(args.object.constructor, "", false, false)
    .some((metadata) => metadata.propertyName === args.property && metadata.name === "isOptional");
}

export function IsMultiSelect(allowedValues: readonly string[]): PropertyDecorator {
  const allowedSet = new Set(allowedValues);

  return (target: object, propertyKey: string | symbol) => {
    Transform(({ value }) => {
      if (typeof value === "string") {
        return value.split(",").map((s) => s.trim());
      }

      return value;
    })(target, propertyKey);

    registerDecorator({
      name: "isMultiSelect",
      target: target.constructor,
      propertyName: String(propertyKey),
      validator: {
        validate(value: unknown, args: ValidationArguments) {
          const isOptional = hasIsOptionalDecorator(args);

          if (value === undefined || value === null || value === "") {
            return isOptional;
          }

          if (!Array.isArray(value)) {
            return false;
          }

          if (value.length === 0) {
            return isOptional;
          }

          return value.every((item) => typeof item === "string" && allowedSet.has(item));
        },
        defaultMessage(args: ValidationArguments) {
          return `${args.property} must contain only allowed values "${allowedValues.join(", ")}".`;
        },
      },
    });
  };
}
