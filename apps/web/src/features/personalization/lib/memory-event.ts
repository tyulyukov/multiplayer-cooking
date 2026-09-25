import { isPlainObject, isString } from "@/shared/lib/type-guards";

export const isMemoryEvent = (
  output: unknown,
): output is { changed: true; action: "added" | "removed"; text: string } => {
  return (
    isPlainObject(output) &&
    "changed" in output &&
    output.changed === true &&
    "action" in output &&
    (output.action === "added" || output.action === "removed") &&
    "text" in output &&
    isString(output.text)
  );
};
