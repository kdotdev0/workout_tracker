<script setup lang="ts">
import { onMounted, onUnmounted, useTemplateRef } from 'vue';
import { usePreferredReducedMotion, useTimeoutFn } from '@vueuse/core';
import confetti, { type CreateTypes } from 'canvas-confetti';

const emit = defineEmits<{ done: [] }>();
const canvasRef = useTemplateRef<HTMLCanvasElement>('canvas');
const reducedMotion = usePreferredReducedMotion();

function themeColors(): string[] {
  const styles = getComputedStyle(document.documentElement);
  const token = (name: string, fallback: string) =>
    styles.getPropertyValue(name).trim() || fallback;
  return [
    token('--primary', '#d4f53c'),
    token('--coral', '#ff7a59'),
    token('--foreground', '#eef0ea'),
    '#ffd166',
    '#5eead4',
  ];
}

let instance: CreateTypes | null = null;
let pending: Array<Promise<null>> = [];
let disposed = false;

const centerBurst = useTimeoutFn(
  () => {
    if (!instance || disposed) return;
    const run = instance({
      particleCount: 36,
      spread: 70,
      startVelocity: 38,
      origin: { x: 0.5, y: 0.35 },
      colors: themeColors(),
      disableForReducedMotion: true,
    });
    if (run) pending.push(run);
    void Promise.all(pending).then(() => {
      if (!disposed) emit('done');
    });
  },
  160,
  { immediate: false },
);

onMounted(() => {
  if (reducedMotion.value === 'reduce' || !canvasRef.value) {
    emit('done');
    return;
  }

  try {
    instance = confetti.create(canvasRef.value, { resize: true, useWorker: false });
    const colors = themeColors();
    const base = {
      particleCount: 34,
      spread: 58,
      startVelocity: 48,
      colors,
      disableForReducedMotion: true,
    };
    const left = instance({ ...base, angle: 60, origin: { x: 0.04, y: 0.82 } });
    const right = instance({ ...base, angle: 120, origin: { x: 0.96, y: 0.82 } });
    pending = [left, right].filter((run): run is Promise<null> => run !== null);
    centerBurst.start();
  } catch {
    emit('done');
  }
});

onUnmounted(() => {
  disposed = true;
  centerBurst.stop();
  instance?.reset();
  instance = null;
});
</script>

<template>
  <Teleport to="body">
    <canvas
      ref="canvas"
      data-confetti
      aria-hidden="true"
      class="pointer-events-none fixed inset-0 z-50 size-full"
    />
  </Teleport>
</template>
