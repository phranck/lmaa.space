import { LanguageToggle } from "@/components/ui/LanguageToggle.tsx";
import { type ReactNode, useEffect, useMemo, useRef } from "react";

// ---------------------------------------------------------------------------
// Deterministic starfield via seeded PRNG (one box-shadow per star)
// ---------------------------------------------------------------------------

function seededRandom(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 16807 + 0) % 2147483647;
    return s / 2147483647;
  };
}

function generateStarfield(): string {
  const rand = seededRandom(42);
  const stars: string[] = [];

  for (let i = 0; i < 90; i++) {
    const x = rand() * 100;
    const y = rand() * 100;
    const brightness = rand();
    const opacity = brightness > 0.85 ? 0.2 + rand() * 0.15 : 0.04 + rand() * 0.1;
    const size = brightness > 0.85 ? 1.5 : 1;
    stars.push(`${x}vw ${y}dvh 0 ${size}px rgba(220, 235, 245, ${opacity})`);
  }

  return stars.join(", ");
}

// ---------------------------------------------------------------------------
// Layered sine wave blob animation
// ---------------------------------------------------------------------------

interface WaveParams {
  freqX: number[];
  freqY: number[];
  ampX: number[];
  ampY: number[];
  phaseX: number[];
  phaseY: number[];
  freqScale: number;
  phaseScale: number;
  freqRot: number;
  phaseRot: number;
}

function randomWaveParams(): WaveParams {
  const r = () => Math.random();
  const TAU = Math.PI * 2;
  return {
    freqX: [0.8 + r() * 0.4, 1.6 + r() * 0.8, 2.5 + r() * 1.5],
    freqY: [0.7 + r() * 0.5, 1.4 + r() * 0.9, 2.3 + r() * 1.2],
    ampX: [35 + r() * 25, 15 + r() * 15, 5 + r() * 10],
    ampY: [30 + r() * 25, 15 + r() * 15, 5 + r() * 10],
    phaseX: [r() * TAU, r() * TAU, r() * TAU],
    phaseY: [r() * TAU, r() * TAU, r() * TAU],
    freqScale: 0.5 + r() * 0.5,
    phaseScale: r() * TAU,
    freqRot: 0.3 + r() * 0.4,
    phaseRot: r() * TAU,
  };
}

function computeTransform(params: WaveParams, t: number): string {
  let x = 0;
  let y = 0;
  for (let i = 0; i < 3; i++) {
    x += params.ampX[i] * Math.sin(params.freqX[i] * t + params.phaseX[i]);
    y += params.ampY[i] * Math.sin(params.freqY[i] * t + params.phaseY[i]);
  }
  const scale = 0.85 + 0.3 * Math.sin(params.freqScale * t + params.phaseScale);
  const rotate = 12 * Math.sin(params.freqRot * t + params.phaseRot);
  return `translate(${x}vw, ${y}dvh) scale(${scale.toFixed(3)}) rotate(${rotate.toFixed(1)}deg)`;
}

const CYCLE_DURATION_MS = 180_000;

// ---------------------------------------------------------------------------
// AuthBackground
// ---------------------------------------------------------------------------

/**
 * Animated background with starfield and floating gradient blobs for auth pages.
 *
 * @param props.children - Centered content (login/setup card).
 * @returns Full-screen animated background wrapper.
 */
export function AuthBackground({ children }: { children: ReactNode }) {
  const blobRefs = useRef<(HTMLDivElement | null)[]>([null, null, null]);
  const starfieldShadow = useMemo(() => generateStarfield(), []);
  const waveParams = useMemo(
    () => [randomWaveParams(), randomWaveParams(), randomWaveParams()],
    [],
  );

  useEffect(() => {
    const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (motionQuery.matches) return;

    let raf: number;
    const startTime = performance.now();

    function animate(now: number) {
      const elapsed = now - startTime;
      const t = (elapsed / CYCLE_DURATION_MS) * Math.PI * 2;

      for (let i = 0; i < 3; i++) {
        const el = blobRefs.current[i];
        if (el) el.style.transform = computeTransform(waveParams[i], t);
      }

      raf = requestAnimationFrame(animate);
    }

    raf = requestAnimationFrame(animate);

    const handleMotionChange = () => {
      if (motionQuery.matches) cancelAnimationFrame(raf);
    };
    motionQuery.addEventListener("change", handleMotionChange);

    return () => {
      cancelAnimationFrame(raf);
      motionQuery.removeEventListener("change", handleMotionChange);
    };
  }, [waveParams]);

  return (
    <div className="relative min-h-screen overflow-hidden bg-[var(--color-background)] flex items-center justify-center px-4">
      {/* Starfield layer - slow rotation */}
      <div
        className="absolute inset-0 pointer-events-none animate-[spin_300s_linear_infinite]"
        style={{ transformOrigin: "50vw 50dvh" }}
        aria-hidden="true"
      >
        <div className="absolute w-px h-px top-0 left-0" style={{ boxShadow: starfieldShadow }} />
      </div>

      {/* Animated blob layer */}
      <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
        <div
          ref={(el) => {
            blobRefs.current[0] = el;
          }}
          className="absolute rounded-full blur-[150px] will-change-transform w-[50vw] h-[50vw] top-[-5%] left-[-5%]"
          style={{ backgroundColor: "color-mix(in srgb, var(--color-primary) 18%, transparent)" }}
        />
        <div
          ref={(el) => {
            blobRefs.current[1] = el;
          }}
          className="absolute rounded-full blur-[160px] will-change-transform w-[45vw] h-[45vw] top-[30%] right-[-10%]"
          style={{ backgroundColor: "oklch(0.55 0.15 280 / 0.12)" }}
        />
        <div
          ref={(el) => {
            blobRefs.current[2] = el;
          }}
          className="absolute rounded-full blur-[170px] will-change-transform w-[55vw] h-[55vw] bottom-[-10%] left-[30%]"
          style={{ backgroundColor: "oklch(0.50 0.12 200 / 0.08)" }}
        />
      </div>

      {/* Language toggle */}
      <div className="absolute top-4 right-4 z-20">
        <LanguageToggle />
      </div>

      {/* Content layer */}
      <div className="relative z-10 w-full flex items-center justify-center">{children}</div>
    </div>
  );
}
