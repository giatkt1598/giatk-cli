import { IsIn, type ValidationOptions } from "class-validator";

export function IsSingleSelect(allowedValues: readonly string[], validationOptions?: ValidationOptions): PropertyDecorator {
  return IsIn([...allowedValues], validationOptions);
}
