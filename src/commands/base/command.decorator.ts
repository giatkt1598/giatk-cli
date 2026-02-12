export const COMMAND_META = "__command_meta__";

export function Command(name: string): ClassDecorator {
  return (target) => {
    Reflect.defineProperty(target, COMMAND_META, {
      value: name,
      writable: false,
    });
  };
}
