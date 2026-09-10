import { useEffect, useRef, useState } from "react";
import type { CookingRoomData } from "./cooking-session";
import { Button } from "@/components/ui/button";
import { proxyConvexStorageUrl } from "@/lib/convex-url";

type ImageStatus = CookingRoomData["steps"][number]["imageStatus"];

export function CookingReference({
  imageUrl,
  status,
  alt,
  disabled,
  onRetry,
}: {
  imageUrl?: string;
  status?: ImageStatus;
  alt: string;
  disabled: boolean;
  onRetry: () => void;
}) {
  const [failed, setFailed] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [showPlaceholder, setShowPlaceholder] = useState(true);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!loaded) return;
    const timer = window.setTimeout(() => setShowPlaceholder(false), 400);
    return () => window.clearTimeout(timer);
  }, [loaded]);

  if (failed)
    return (
      <p className="cooking-image-error" role="alert">
        Зображення не завантажилось.{" "}
        <Button
          size="chip"
          variant="ghost"
          onClick={() => {
            setFailed(false);
            setLoaded(false);
            setShowPlaceholder(true);
            setAttempt((value) => value + 1);
          }}
        >
          Завантажити ще раз
        </Button>
      </p>
    );

  if (imageUrl || status === "pending")
    return (
      <figure className={`cooking-reference-figure ${loaded ? "is-revealed" : ""}`}>
        <div className="cooking-reference-slot">
          {showPlaceholder && <ReferencePlaceholder animate={!loaded} />}
          {imageUrl && (
            <img
              key={attempt}
              className="cooking-reference"
              src={proxyConvexStorageUrl(imageUrl)}
              alt={alt}
              loading="lazy"
              width={600}
              height={400}
              onLoad={() => setLoaded(true)}
              onError={() => setFailed(true)}
            />
          )}
        </div>
        {loaded ? (
          <figcaption>{alt}</figcaption>
        ) : (
          <figcaption role="status">
            <i aria-hidden />
            Готуємо зображення…
          </figcaption>
        )}
      </figure>
    );

  return (
    <p className="cooking-image-error">
      {status === "error"
        ? "Не вдалося створити зображення."
        : "Для цього кроку є візуальна підказка."}{" "}
      <Button size="chip" variant="ghost" disabled={disabled} onClick={onRetry}>
        {status === "error" ? "Спробувати ще раз" : "Створити зображення"}
      </Button>
    </p>
  );
}

function ReferencePlaceholder({ animate }: { animate: boolean }) {
  const canvas = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const element = canvas.current;
    const context = element?.getContext("2d");
    if (!element || !context) return;

    let frame = 0;
    let visible = document.visibilityState === "visible";
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const draw = (time = 0) => {
      const bounds = element.getBoundingClientRect();
      const ratio = Math.min(window.devicePixelRatio || 1, 2);
      const width = Math.max(1, Math.round(bounds.width));
      const height = Math.max(1, Math.round(bounds.height));
      if (element.width !== width * ratio || element.height !== height * ratio) {
        element.width = width * ratio;
        element.height = height * ratio;
      }
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
      context.clearRect(0, 0, width, height);
      context.fillStyle = colors.background;
      context.fillRect(0, 0, width, height);
      const phase = time / 1800;
      const focusX = width * (0.5 + Math.sin(phase) * 0.18);
      const focusY = height * (0.5 + Math.cos(phase * 0.8) * 0.14);
      const spread = Math.min(width, height) * 0.28;
      const gap = 8;
      context.fillStyle = colors.ink;
      for (let y = (height % gap) / 2; y < height; y += gap) {
        for (let x = (width % gap) / 2; x < width; x += gap) {
          const dx = x - focusX;
          const dy = y - focusY;
          const intensity = Math.exp(-(dx * dx + dy * dy) / (spread * spread));
          context.globalAlpha = 0.14 + intensity * 0.7;
          context.beginPath();
          context.arc(x, y, 0.65 + intensity * 0.95, 0, Math.PI * 2);
          context.fill();
        }
      }
      context.globalAlpha = 1;
    };
    const colors = {
      background: "",
      ink: "",
    };
    const readColors = () => {
      const styles = getComputedStyle(element);
      colors.background = styles.getPropertyValue("--background").trim();
      colors.ink = styles.getPropertyValue("--foreground").trim();
    };
    const loop = (time: number) => {
      draw(time);
      if (visible && animate && !reducedMotion.matches) frame = requestAnimationFrame(loop);
    };
    const restart = () => {
      cancelAnimationFrame(frame);
      readColors();
      draw();
      if (visible && animate && !reducedMotion.matches) frame = requestAnimationFrame(loop);
    };
    const onVisibilityChange = () => {
      visible = document.visibilityState === "visible";
      restart();
    };
    const observer =
      typeof ResizeObserver === "undefined" ? undefined : new ResizeObserver(restart);
    observer?.observe(element);
    window.addEventListener("resize", restart);
    document.addEventListener("visibilitychange", onVisibilityChange);
    reducedMotion.addEventListener("change", restart);
    restart();
    return () => {
      cancelAnimationFrame(frame);
      observer?.disconnect();
      window.removeEventListener("resize", restart);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      reducedMotion.removeEventListener("change", restart);
    };
  }, [animate]);

  return <canvas className="cooking-reference-placeholder" ref={canvas} aria-hidden />;
}
