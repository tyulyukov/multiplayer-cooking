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
      const scale = Math.max(14, Math.min(width, height) / 12);
      for (let index = 0; index < 3; index += 1) {
        const phase = time / 2500 + index * 2.1;
        const centerX = width * (0.24 + index * 0.28) + Math.sin(phase) * scale * 0.55;
        const centerY = height * (0.48 + Math.cos(phase * 0.7) * 0.1);
        for (let y = -4; y <= 4; y += 1) {
          for (let x = -5; x <= 5; x += 1) {
            const distance = Math.hypot(x / 1.25, y);
            if (distance > 4.5 || (x * 7 + y * 11 + index * 3) % 5 === 0) continue;
            const drift = Math.sin(phase + x * 0.8 + y * 0.45) * 1.5;
            context.fillStyle = index === 1 && (x + y) % 4 === 0 ? colors.teal : colors.ink;
            context.globalAlpha = Math.max(0.16, 0.62 - distance * 0.1);
            context.beginPath();
            context.arc(
              centerX + x * scale * 0.62 + drift,
              centerY + y * scale * 0.62,
              1.5,
              0,
              Math.PI * 2,
            );
            context.fill();
          }
        }
      }
      context.globalAlpha = 1;
    };
    const colors = {
      background: "",
      ink: "",
      teal: "",
    };
    const readColors = () => {
      const styles = getComputedStyle(element);
      colors.background = styles.getPropertyValue("--background").trim();
      colors.ink = styles.getPropertyValue("--foreground").trim();
      colors.teal = styles.getPropertyValue("--teal-deep").trim();
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
