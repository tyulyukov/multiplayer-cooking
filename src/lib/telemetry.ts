import type { Metric } from "web-vitals";

export type WebVitalEvent = Pick<
  Metric,
  "delta" | "id" | "name" | "navigationType" | "rating" | "value"
>;

export type WebVitalReporter = (event: WebVitalEvent) => void;

export async function observeWebVitals(report: WebVitalReporter) {
  const { onCLS, onFCP, onINP, onLCP, onTTFB } = await import("web-vitals");
  const forward = (metric: Metric) => {
    const { delta, id, name, navigationType, rating, value } = metric;
    report({ delta, id, name, navigationType, rating, value });
  };

  onCLS(forward);
  onFCP(forward);
  onINP(forward);
  onLCP(forward);
  onTTFB(forward);
}
