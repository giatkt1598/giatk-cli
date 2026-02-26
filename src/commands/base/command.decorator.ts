export const COMMAND_META = "__command_meta__";

export interface CommandOptions {
  description?: string;
  example?: string;
}

export interface CommandMetadata {
  name: string;
  options?: CommandOptions;
}

export function Command(name: string, options?: CommandOptions): ClassDecorator {
  return (target) => {
    Reflect.defineProperty(target, COMMAND_META, {
      value: { name, options } as CommandMetadata,
      writable: false,
    });
  };
}
