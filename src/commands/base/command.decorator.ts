export const COMMAND_META = Symbol("command");

export function Command(name: string): ClassDecorator {
  return (target) => {
    Reflect.defineProperty(target, COMMAND_META, {
      value: name,
      writable: false,
    });
  };
}
