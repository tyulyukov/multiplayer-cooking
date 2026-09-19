export function readMemoryEvent(output: unknown) {
  if (
    typeof output !== "object" ||
    output === null ||
    !("changed" in output) ||
    output.changed !== true ||
    !("action" in output) ||
    (output.action !== "added" && output.action !== "removed") ||
    !("text" in output) ||
    typeof output.text !== "string"
  ) {
    return null;
  }
  return { action: output.action, text: output.text };
}
