<script setup lang="ts">
import { onMounted, onUnmounted, useTemplateRef } from 'vue';
import { usePreferredReducedMotion } from '@vueuse/core';

const emit = defineEmits<{ done: [] }>();
const canvasRef = useTemplateRef<HTMLCanvasElement>('canvas');
const reducedMotion = usePreferredReducedMotion();

// Steady night-gym celebration palette: volt lime primary, coral accent, warm gold, ivory, mint.
const PALETTE = ['#d4f53c', '#e8ff7a', '#ff7a59', '#ffd166', '#eef0ea', '#5eead4'] as const;
const DURATION_MS = 2800;
const FADE_START_MS = 1900;

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  aspect: number;
  shape: 'rect' | 'ribbon' | 'circle';
  color: string;
  rotation: number;
  rotationSpeed: number;
  tilt: number;
  tiltSpeed: number;
  wobbleFreq: number;
  wobbleAmp: number;
  delay: number;
}

function createBurst(width: number, height: number): Particle[] {
  const particles: Particle[] = [];
  const compact = width < 520;
  const sideCount = compact ? 30 : 38;
  const centerCount = compact ? 24 : 32;

  const spawn = (
    originX: number,
    originY: number,
    angleMin: number,
    angleMax: number,
    speedMin: number,
    speedMax: number,
    delay: number,
  ) => {
    const angle = angleMin + Math.random() * (angleMax - angleMin);
    const speed = speedMin + Math.random() * (speedMax - speedMin);
    const roll = Math.random();
    const shape: Particle['shape'] = roll < 0.55 ? 'rect' : roll < 0.82 ? 'ribbon' : 'circle';
    particles.push({
      x: originX,
      y: originY,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      size: shape === 'circle' ? 3.5 + Math.random() * 3.5 : 5 + Math.random() * 5,
      aspect: shape === 'ribbon' ? 0.35 + Math.random() * 0.2 : 0.55 + Math.random() * 0.35,
      shape,
      color: PALETTE[Math.floor(Math.random() * PALETTE.length)]!,
      rotation: Math.random() * Math.PI * 2,
      rotationSpeed: (Math.random() - 0.5) * 9,
      tilt: Math.random() * Math.PI * 2,
      tiltSpeed: 4 + Math.random() * 7,
      wobbleFreq: 3 + Math.random() * 4,
      wobbleAmp: 12 + Math.random() * 20,
      delay,
    });
  };

  // Left and right upward cannons from lower sides.
  const launchY = height * 0.82;
  const baseSpeed = Math.min(920, Math.max(600, height * 0.95));
  for (let i = 0; i < sideCount; i++) {
    spawn(
      width * 0.06,
      launchY,
      -Math.PI * 0.44,
      -Math.PI * 0.16,
      baseSpeed * 0.62,
      baseSpeed * 1.05,
      0,
    );
    spawn(
      width * 0.94,
      launchY,
      -Math.PI * 0.84,
      -Math.PI * 0.56,
      baseSpeed * 0.62,
      baseSpeed * 1.05,
      0,
    );
  }

  // Secondary center pop slightly later for a layered finish.
  for (let i = 0; i < centerCount; i++) {
    spawn(
      width * 0.5 + (Math.random() - 0.5) * width * 0.16,
      height * 0.32,
      -Math.PI * 0.92,
      -Math.PI * 0.08,
      baseSpeed * 0.32,
      baseSpeed * 0.72,
      160,
    );
  }

  return particles;
}

let rafId = 0;
let fallbackTimer: ReturnType<typeof setTimeout> | undefined;

function stop() {
  if (rafId) {
    cancelAnimationFrame(rafId);
    rafId = 0;
  }
  if (fallbackTimer !== undefined) {
    clearTimeout(fallbackTimer);
    fallbackTimer = undefined;
  }
}

onMounted(() => {
  if (reducedMotion.value === 'reduce') {
    emit('done');
    return;
  }

  const canvas = canvasRef.value;
  if (!canvas) {
    emit('done');
    return;
  }

  let ctx: CanvasRenderingContext2D | null = null;
  try {
    ctx = canvas.getContext('2d');
  } catch {
    ctx = null;
  }
  if (!ctx) {
    fallbackTimer = setTimeout(() => emit('done'), DURATION_MS);
    return;
  }

  let width = window.innerWidth || 390;
  let height = window.innerHeight || 844;
  const resize = () => {
    width = window.innerWidth || 390;
    height = window.innerHeight || 844;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  };
  resize();

  const particles = createBurst(width, height);
  const startedAt = performance.now();
  let lastTime = startedAt;
  const gravity = 1150;

  const tick = (now: number) => {
    const elapsed = now - startedAt;
    if (elapsed >= DURATION_MS) {
      ctx.clearRect(0, 0, width, height);
      rafId = 0;
      emit('done');
      return;
    }

    const dt = Math.min((now - lastTime) / 1000, 0.05);
    lastTime = now;
    const drag = Math.pow(0.985, dt * 60);
    const fade =
      elapsed > FADE_START_MS
        ? Math.max(0, 1 - (elapsed - FADE_START_MS) / (DURATION_MS - FADE_START_MS))
        : 1;

    ctx.clearRect(0, 0, width, height);

    for (const p of particles) {
      const ageMs = elapsed - p.delay;
      if (ageMs < 0) continue;
      const ageSec = ageMs / 1000;

      p.vx *= drag;
      p.vy = p.vy * drag + gravity * dt;
      p.x += (p.vx + Math.sin(ageSec * p.wobbleFreq) * p.wobbleAmp) * dt;
      p.y += p.vy * dt;
      p.rotation += p.rotationSpeed * dt;
      p.tilt += p.tiltSpeed * dt;

      if (p.y > height + 30) continue;

      ctx.save();
      ctx.globalAlpha = fade;
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rotation);
      ctx.fillStyle = p.color;

      if (p.shape === 'circle') {
        ctx.beginPath();
        ctx.arc(0, 0, p.size * 0.5, 0, Math.PI * 2);
        ctx.fill();
      } else {
        const flutter = 0.25 + 0.75 * Math.abs(Math.cos(p.tilt));
        const w = p.size;
        const h = p.size * p.aspect * flutter;
        ctx.fillRect(-w / 2, -h / 2, w, h);
      }
      ctx.restore();
    }

    rafId = requestAnimationFrame(tick);
  };

  rafId = requestAnimationFrame(tick);
});

onUnmounted(stop);
</script>

<template>
  <canvas
    ref="canvas"
    data-confetti
    aria-hidden="true"
    class="pointer-events-none fixed inset-0 z-50 size-full"
  />
</template>
