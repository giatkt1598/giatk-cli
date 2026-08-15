type JsonObject = Record<string, unknown>;

function isJsonObject(value: unknown): value is JsonObject {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function createEmptyConfigValue(value: unknown): unknown {
  if (typeof value === "string") {
    return "";
  }

  if (!isJsonObject(value)) {
    return null;
  }

  return Object.fromEntries(Object.entries(value).map(([key, child]) => [key, createEmptyConfigValue(child)]));
}

/** Adds missing keys from base config without changing existing production values. */
export function synchronizeMissingConfigKeys(base: JsonObject, production: JsonObject): boolean {
  let changed = false;

  for (const key of Object.keys(production)) {
    if (!Object.prototype.hasOwnProperty.call(base, key)) {
      delete production[key];
      changed = true;
    }
  }

  for (const [key, baseValue] of Object.entries(base)) {
    if (!Object.prototype.hasOwnProperty.call(production, key)) {
      production[key] = createEmptyConfigValue(baseValue);
      changed = true;
      continue;
    }

    const productionValue = production[key];
    if (isJsonObject(baseValue) && isJsonObject(productionValue)) {
      changed = synchronizeMissingConfigKeys(baseValue, productionValue) || changed;
    }
  }

  return changed;
}
