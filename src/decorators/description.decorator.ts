export const ARG_DESCRIPTION_META = "__arg_description_meta__";

export function Description(text: string): PropertyDecorator {
  return (target: object, propertyKey: string | symbol) => {
    const metadata = Reflect.getMetadata(ARG_DESCRIPTION_META, target.constructor) as Record<string, string> | undefined;
    const next = { ...(metadata ?? {}), [String(propertyKey)]: text };
    Reflect.defineMetadata(ARG_DESCRIPTION_META, next, target.constructor);
  };
}

export function getArgumentDescriptions(target: Function): Record<string, string> {
  return (Reflect.getMetadata(ARG_DESCRIPTION_META, target) as Record<string, string> | undefined) ?? {};
}
