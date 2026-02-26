import { parseArgs } from "@/infrastructures/parse-args.js";
import { plainToInstance } from "class-transformer";
import { getMetadataStorage, validateSync, type ValidationError } from "class-validator";

type ClassType<T extends object> = new () => T;

export abstract class BaseCommand<TArgs extends object = Record<string, unknown>> {
  args!: TArgs;

  constructor(argsType?: ClassType<TArgs>) {
    this.args = this.transformArgs(argsType);

    if (argsType) {
      this.validateArgsOrThrow();
    }
  }

  abstract executeAsync(args?: TArgs): Promise<void>;

  private transformArgs(argsType?: ClassType<TArgs>) {
    const { options } = parseArgs(process.argv.slice(2));
    if (!argsType) {
      return options as TArgs;
    }

    // Convert 'false' and 'true' strings to boolean values when type of property in argsType is boolean
    const instance = plainToInstance(argsType, options, {
      enableImplicitConversion: false,
      exposeDefaultValues: true,
    });

    const booleanFields = new Set(
      getMetadataStorage()
        .getTargetValidationMetadatas(argsType, "", false, false)
        .filter((metadata) => metadata.name === "isBoolean")
        .map((metadata) => metadata.propertyName),
    );

    for (const key in instance) {
      const value = instance[key];
      if (!booleanFields.has(key) || typeof value !== "string") {
        continue;
      }

      if (value.toLowerCase() === "true") {
        Object.assign(instance, { [key]: true });
      } else if (value.toLowerCase() === "false") {
        Object.assign(instance, { [key]: false });
      }
    }

    return instance;
  }

  private validateArgsOrThrow() {
    const errors = validateSync(this.args as object, {
      whitelist: true,
      forbidNonWhitelisted: true,
    });

    if (errors.length === 0) {
      return;
    }

    const details = this.flattenValidationErrors(errors);
    throw new Error(`Invalid input:\n${details}`);
  }

  private flattenValidationErrors(errors: ValidationError[], parent = ""): string {
    const messages: string[] = [];

    for (const error of errors) {
      const path = parent ? `${parent}.${error.property}` : error.property;

      if (error.constraints) {
        for (const message of Object.values(error.constraints)) {
          messages.push(` --${path}: ${message}`);
        }
      }

      if (error.children && error.children.length > 0) {
        messages.push(this.flattenValidationErrors(error.children, path));
      }
    }

    return messages.join("\n");
  }
}

export function CommandOf<TArgs extends object>(argsType: ClassType<TArgs>) {
  abstract class TypedCommand extends BaseCommand<TArgs> {
    constructor() {
      super(argsType);
    }
  }

  return TypedCommand;
}
