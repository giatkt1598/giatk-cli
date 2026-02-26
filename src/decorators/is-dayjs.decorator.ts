import dayjs from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat.js";
import { Transform } from "class-transformer";
import { registerDecorator, type ValidationArguments, type ValidationOptions } from "class-validator";

dayjs.extend(customParseFormat);

export interface IsDayjsValidationOptions extends ValidationOptions {
  format?: string | string[];
}

export function IsDayjs(validationOptions?: IsDayjsValidationOptions): PropertyDecorator {
  const format = validationOptions?.format;

  return (target: object, propertyKey: string | symbol) => {
    Transform(({ value }) => {
      if (value === undefined || value === null || value === "") {
        return value;
      }

      if (dayjs.isDayjs(value)) {
        return value;
      }

      if (typeof value === "string" && format) {
        return dayjs(value, format, true);
      }

      return dayjs(value);
    })(target, propertyKey);

    const { format: _format, ...validatorOptions } = validationOptions ?? {};

    registerDecorator({
      name: "isDayjs",
      target: target.constructor,
      propertyName: String(propertyKey),
      options: validatorOptions,
      validator: {
        validate(value: unknown) {
          return dayjs.isDayjs(value) && value.isValid();
        },
        defaultMessage(args: ValidationArguments) {
          if (format) {
            const formatText = Array.isArray(format) ? format.join(", ") : format;
            return `${args.property} must be a valid Dayjs date with format: ${formatText}`;
          }

          return `${args.property} must be a valid Dayjs date`;
        },
      },
    });
  };
}
