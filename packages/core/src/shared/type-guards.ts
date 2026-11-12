export function isString(value: unknown): value is string {
  return typeof value === "string";
}

export function isPlainObject(value: unknown): value is object {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
