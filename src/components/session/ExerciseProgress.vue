<script setup lang="ts">
import { computed } from 'vue';
import type { Session } from '@/domain/state';
import { isForearmExercise } from '@/domain/programme';
import { isExerciseComplete } from '@/domain/sessions';

const props = defineProps<{ exercises: Session['exercises']; selected?: number }>();
const emit = defineEmits<{ select: [index: number] }>();

const forearmBreakIndex = computed(() => {
  const index = props.exercises.findIndex((item) => isForearmExercise(item.exercise));
  return index > 0 && props.exercises.slice(index).every((item) => isForearmExercise(item.exercise))
    ? index
    : -1;
});
</script>

<template>
  <nav v-if="selected !== undefined" aria-label="Exercises" class="step-bar">
    <button
      v-for="(item, index) in exercises"
      :key="item.exercise.id"
      type="button"
      :aria-current="selected === index ? 'step' : undefined"
      :aria-label="`${index + 1}. ${item.exercise.name}, ${item.logs.length} of ${item.exercise.sets} sets`"
      :class="{
        'is-current': selected === index,
        'is-done': isExerciseComplete(item),
        'is-group-break': index === forearmBreakIndex,
      }"
      @click="emit('select', index)"
    >
      <span />
    </button>
  </nav>
  <div v-else class="segments" aria-hidden="true">
    <span
      v-for="(item, index) in exercises"
      :key="item.exercise.id"
      :class="{ 'is-group-break': index === forearmBreakIndex }"
    >
      <i :style="{ transform: `scaleX(${isExerciseComplete(item) ? 1 : 0})` }" />
    </span>
  </div>
</template>
