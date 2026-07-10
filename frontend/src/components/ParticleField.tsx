import { useEffect, useRef } from "react";

const PARTICLE_COLORS = [
  "rgb(139 92 246 / 0.4)",   // violet
  "rgb(6 182 212 / 0.35)",   // cyan
  "rgb(20 184 166 / 0.3)",   // teal
  "rgb(129 140 248 / 0.25)", // soft indigo
  "rgb(34 211 238 / 0.2)",   // sky
];

export function ParticleField() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = ref.current;
    if (!container) return;

    const particles: HTMLDivElement[] = [];
    const count = 30;

    for (let i = 0; i < count; i++) {
      const particle = document.createElement("div");
      particle.className = "particle";
      const size = Math.random() * 4 + 1.5;
      particle.style.width = `${size}px`;
      particle.style.height = `${size}px`;
      particle.style.left = `${Math.random() * 100}%`;
      particle.style.backgroundColor = PARTICLE_COLORS[i % PARTICLE_COLORS.length];
      particle.style.boxShadow = `0 0 ${size * 3}px currentColor`;
      particle.style.animationDuration = `${Math.random() * 18 + 8}s`;
      particle.style.animationDelay = `${Math.random() * 15}s`;
      container.appendChild(particle);
      particles.push(particle);
    }

    return () => {
      particles.forEach((p) => p.remove());
    };
  }, []);

  return <div ref={ref} className="particle-field bg-gradient-abyss" />;
}
