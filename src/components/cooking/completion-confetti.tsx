import { useEffect, useRef } from "react";

export function CompletionConfetti() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (!canvas || motion.matches) return;
    const context = canvas.getContext("2d");
    if (!context) return;

    const width = window.innerWidth;
    const height = window.innerHeight;
    const density = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = width * density;
    canvas.height = height * density;
    context.scale(density, density);
    const style = getComputedStyle(canvas);
    const colors = ["--teal", "--primary", "--background", "--foreground"].map((token) =>
      style.getPropertyValue(token).trim(),
    );
    const particles = Array.from({ length: 72 }, (_, index) => {
      const side = index % 2 === 0 ? 1 : -1;
      return {
        x: side === 1 ? width * 0.12 : width * 0.88,
        y: Math.min(height * 0.55, 440),
        vx: side * (70 + Math.random() * Math.min(width * 0.6, 480)),
        vy: -260 - Math.random() * 300,
        rotation: Math.random() * Math.PI,
        spin: (Math.random() - 0.5) * 12,
        size: 5 + Math.random() * 5,
        color: colors[index % colors.length],
      };
    });
    const start = performance.now();
    let frame = 0;
    const stop = () => {
      cancelAnimationFrame(frame);
      context.clearRect(0, 0, width, height);
      canvas.hidden = true;
    };
    const draw = (now: number) => {
      const seconds = (now - start) / 1000;
      if (seconds >= 2) {
        stop();
        return;
      }
      context.clearRect(0, 0, width, height);
      context.globalAlpha = Math.min(1, (2 - seconds) / 0.5);
      for (const particle of particles) {
        context.save();
        context.translate(
          particle.x + particle.vx * seconds * (1 - seconds * 0.15),
          particle.y + particle.vy * seconds + 340 * seconds * seconds,
        );
        context.rotate(particle.rotation + particle.spin * seconds);
        context.fillStyle = particle.color;
        context.fillRect(-particle.size / 2, -particle.size / 4, particle.size, particle.size / 2);
        context.restore();
      }
      frame = requestAnimationFrame(draw);
    };
    canvas.hidden = false;
    frame = requestAnimationFrame(draw);
    motion.addEventListener("change", stop);
    window.addEventListener("resize", stop);
    return () => {
      stop();
      motion.removeEventListener("change", stop);
      window.removeEventListener("resize", stop);
    };
  }, []);

  return <canvas ref={ref} className="completion-confetti" aria-hidden />;
}
