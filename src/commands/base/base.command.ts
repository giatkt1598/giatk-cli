import { plainToInstance } from "class-transformer";
import { getMetadataStorage, validateSync, type ValidationError } from "class-validator";
import { getArgumentShortcuts } from "../../decorators/shortcut.decorator.js";
import { parseArgs } from "../../infrastructures/parse-args.js";

type ClassType<T extends object> = new () => T;
export const COMMAND_ARGS_TYPE_META = "__command_args_type_meta__";

export abstract class BaseCommand<TArgs extends object = Record<string, unknown>> {
  args!: TArgs;
  constructor(argsType?: ClassType<TArgs>) {
    this.args = this.transformArgs(argsType);

    if (argsType) {
      this.validateArgsOrThrow();
    }
  }

  abstract executeAsync(args?: TArgs): Promise<void>;

  //#region Transform args and validate
  private transformArgs(argsType?: ClassType<TArgs>) {
    const parsedArgs = parseArgs();
    const { options } = parsedArgs;
    if (!argsType) {
      return options as TArgs;
    }

    const normalizedOptions = { ...options };
    const argumentShortcuts = getArgumentShortcuts(argsType);
    for (const [property, shortcut] of Object.entries(argumentShortcuts)) {
      if (normalizedOptions[property] === undefined && normalizedOptions[shortcut] !== undefined) {
        normalizedOptions[property] = normalizedOptions[shortcut];
      }
      if (shortcut !== property) {
        delete normalizedOptions[shortcut];
      }
    }

    // Convert 'false' and 'true' strings to boolean values when type of property in argsType is boolean
    const instance = plainToInstance(argsType, normalizedOptions, {
      enableImplicitConversion: false,
      exposeDefaultValues: true,
    });

    const booleanFields = new Set(
      getMetadataStorage()
        .getTargetValidationMetadatas(argsType, "", false, false)
        .filter((metadata) => metadata.name === "isBoolean")
        .map((metadata) => metadata.propertyName),
    );
    const numberFields = new Set(
      getMetadataStorage()
        .getTargetValidationMetadatas(argsType, "", false, false)
        .filter((metadata) => metadata.name && ["isInt", "isNumber"].includes(metadata.name))
        .map((metadata) => metadata.propertyName),
    );
    const dateFields = new Set(
      getMetadataStorage()
        .getTargetValidationMetadatas(argsType, "", false, false)
        .filter((metadata) => metadata.name === "isDate")
        .map((metadata) => metadata.propertyName),
    );

    for (const key in instance) {
      const value = instance[key];
      if (typeof value !== "string") {
        continue;
      }

      if (booleanFields.has(key)) {
        if (value.toLowerCase() === "true") {
          Object.assign(instance, { [key]: true });
        } else if (value.toLowerCase() === "false") {
          Object.assign(instance, { [key]: false });
        }
        continue;
      }

      if (numberFields.has(key)) {
        const normalizedValue = value.trim();
        if (!normalizedValue) {
          continue;
        }

        Object.assign(instance, { [key]: Number(normalizedValue) });
        continue;
      }

      if (dateFields.has(key)) {
        const normalizedValue = value.trim();
        if (!normalizedValue) {
          continue;
        }

        Object.assign(instance, { [key]: new Date(normalizedValue) });
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
  //#endregion
}

export function CommandOf<TArgs extends object>(argsType: ClassType<TArgs>) {
  abstract class TypedCommand extends BaseCommand<TArgs> {
    constructor() {
      super(argsType);
    }
  }

  Reflect.defineProperty(TypedCommand, COMMAND_ARGS_TYPE_META, {
    value: argsType,
    writable: false,
  });

  return TypedCommand;
}
