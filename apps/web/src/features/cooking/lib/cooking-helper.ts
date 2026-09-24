export const helperContextStep = (
  steps: readonly { id: string }[],
  selectedStepKey?: string,
  activeStepKey?: string,
) => {
  const candidate = selectedStepKey ?? activeStepKey;

  return steps.some((step) => step.id === candidate) ? candidate : undefined;
};
