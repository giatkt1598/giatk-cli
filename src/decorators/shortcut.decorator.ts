export const ARG_SHORTCUT_META = "__arg_shortcut_meta__";

export function Shortcut(shortcut: string): PropertyDecorator {
  const normalizedShortcut = shortcut.replace(/^-/, "").trim();
  if (!normalizedShortcut) {
    throw new Error("Argument shortcut cannot be empty.");
  }

  return (target: object, propertyKey: string | symbol) => {
    const metadata = Reflect.getMetadata(ARG_SHORTCUT_META, target.constructor) as Record<string, string> | undefined;
    const next = { ...(metadata ?? {}), [String(propertyKey)]: normalizedShortcut };
    Reflect.defineMetadata(ARG_SHORTCUT_META, next, target.constructor);
  };
}

export function getArgumentShortcuts(target: Function): Record<string, string> {
  return (Reflect.getMetadata(ARG_SHORTCUT_META, target) as Record<string, string> | undefined) ?? {};
}
