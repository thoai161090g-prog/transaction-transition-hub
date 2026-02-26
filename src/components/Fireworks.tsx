import { useEffect, useRef } from "react";

interface Particle {
  x: number; y: number; vx: number; vy: number;
  life: number; maxLife: number;
  color: string; size: number; trail: { x: number; y: number }[];
}

const COLORS = ["#ffd700", "#ff6a6a", "#00ff88", "#00c3ff", "#ff8c00", "#ff4500", "#ff1493", "#7fff00"];

export default function Fireworks() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let particles: Particle[] = [];
    let animId: number;

    const resize = () => { canvas.width = window.innerWidth; canvas.height = window.innerHeight; };
    resize();
    window.addEventListener("resize", resize);

    const explode = (x: number, y: number) => {
      const count = 40 + Math.random() * 30;
      const color = COLORS[Math.floor(Math.random() * COLORS.length)];
      for (let i = 0; i < count; i++) {
        const angle = (Math.PI * 2 * i) / count + Math.random() * 0.3;
        const speed = 2 + Math.random() * 4;
        particles.push({
          x, y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed,
          life: 0, maxLife: 60 + Math.random() * 40,
          color, size: 1.5 + Math.random() * 2, trail: [],
        });
      }
    };

    let timer = 0;
    const loop = () => {
      ctx.fillStyle = "rgba(0,0,0,0.08)";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      timer++;
      if (timer % 50 === 0) explode(Math.random() * canvas.width, Math.random() * canvas.height * 0.5 + 50);
      if (timer % 80 === 0) explode(Math.random() * canvas.width, Math.random() * canvas.height * 0.4 + 30);

      particles = particles.filter((p) => p.life < p.maxLife);
      for (const p of particles) {
        p.trail.push({ x: p.x, y: p.y });
        if (p.trail.length > 6) p.trail.shift();
        p.x += p.vx; p.y += p.vy;
        p.vy += 0.04; p.vx *= 0.99;
        p.life++;

        const alpha = 1 - p.life / p.maxLife;
        // Trail
        for (let i = 0; i < p.trail.length; i++) {
          const ta = (i / p.trail.length) * alpha * 0.4;
          ctx.beginPath();
          ctx.arc(p.trail[i].x, p.trail[i].y, p.size * 0.5, 0, Math.PI * 2);
          ctx.fillStyle = p.color + Math.round(ta * 255).toString(16).padStart(2, "0");
          ctx.fill();
        }
        // Main
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * alpha, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.globalAlpha = alpha;
        ctx.shadowBlur = 8;
        ctx.shadowColor = p.color;
        ctx.fill();
        ctx.globalAlpha = 1;
        ctx.shadowBlur = 0;
      }
      animId = requestAnimationFrame(loop);
    };
    loop();

    return () => { cancelAnimationFrame(animId); window.removeEventListener("resize", resize); };
  }, []);

  return <canvas ref={canvasRef} className="fixed inset-0 pointer-events-none z-0" />;
}
