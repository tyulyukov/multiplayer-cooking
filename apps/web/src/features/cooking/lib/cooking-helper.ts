export function helperContextStep(
  steps: readonly { id: string }[],
  selectedStepKey?: string,
  activeStepKey?: string,
): string | undefined {
  const candidate = selectedStepKey ?? activeStepKey;
  return steps.some((step) => step.id === candidate) ? candidate : undefined;
}
