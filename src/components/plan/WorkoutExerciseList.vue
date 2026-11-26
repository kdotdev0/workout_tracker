<script setup lang="ts">
import { computed } from 'vue';
import { ChevronDown } from '@lucide/vue';
import type { Exercise } from '@/domain/programme-types';
import { isForearmExercise } from '@/domain/programme';
import { restFor } from '@/domain/sessions';
import ExerciseGuide from '@/components/ExerciseGuide.vue';
import ExerciseIcon from '@/components/ExerciseIcon.vue';

const props = defineProps<{
  exercises: Exercise[];
  restMinutes: number | null;
  swappableIds: Set<string>;
}>();
const emit = defineEmits<{ swap: [exerciseId: string] }>();

interface ExerciseGroup {
  key: 'main' | 'forearms';
  label?: string;
  sets: number;
  items: Exercise[];
}

const groups = computed<ExerciseGroup[]>(() => {
  const firstForearm = props.exercises.findIndex(isForearmExercise);
  if (firstForearm <= 0 || !props.exercises.slice(firstForearm).every(isForearmExercise)) {
    return [
      {
        key: 'main',
        sets: props.exercises.reduce((sum, exercise) => sum + exercise.sets, 0),
        items: props.exercises,
      },
    ];
  }
  const main = props.exercises.slice(0, firstForearm);
  const forearms = props.exercises.slice(firstForearm);
  return [
    {
      key: 'main',
      sets: main.reduce((sum, exercise) => sum + exercise.sets, 0),
      items: main,
    },
    {
      key: 'forearms',
      label: 'Forearms',
      sets: forearms.reduce((sum, exercise) => sum + exercise.sets, 0),
      items: forearms,
    },
  ];
});
</script>

<template>
  <section class="flex flex-col gap-4">
    <div class="flex items-end justify-between gap-2">
      <h3 class="section-heading">Exercise order</h3>
      <span class="text-muted-foreground text-xs"
        >Sets ×
        {{
          exercises.some((exercise) => exercise.unit === 'seconds') ? 'reps / time' : 'reps'
        }}</span
      >
    </div>

    <div class="flex flex-col gap-3">
      <template v-for="group in groups" :key="group.key">
        <div v-if="group.label" data-forearm-separator class="flex items-center gap-3 px-1 pt-1">
          <span class="text-muted-foreground text-xs font-medium">{{ group.label }}</span>
          <span class="bg-border/60 h-px flex-1" aria-hidden="true" />
          <span class="text-muted-foreground text-xs tabular-nums"
            >{{ group.sets }} {{ group.sets === 1 ? 'set' : 'sets' }}</span
          >
        </div>
        <div
          :class="['exercise-list', group.key === 'forearms' && 'exercise-list--forearms']"
          :data-exercise-group="group.key"
        >
          <details v-for="exercise in group.items" :key="exercise.id" class="group/exercise">
            <summary class="exercise-row">
              <ExerciseIcon :exercise-id="exercise.id" class="size-11 shrink-0" />
              <span class="flex min-w-0 flex-1 flex-col gap-1.5">
                <span class="text-sm leading-snug font-semibold">{{ exercise.name }}</span>
                <small class="text-muted-foreground text-xs leading-relaxed"
                  >{{ restFor(exercise, restMinutes).label }} rest · {{ exercise.targetRir
                  }}{{ exercise.unit === 'seconds' ? '' : ' RIR' }}</small
                >
              </span>
              <span class="exercise-prescription flex shrink-0 flex-col items-end gap-1 text-right">
                <strong class="font-display text-lg leading-none font-semibold tabular-nums"
                  >{{ exercise.sets }} × {{ exercise.min }}–{{ exercise.max }}</strong
                >
                <small
                  v-if="exercise.perSide || exercise.unit !== 'reps'"
                  class="text-muted-foreground text-xs"
                  >{{ exercise.unit }}{{ exercise.perSide ? ' / side' : '' }}</small
                >
                <ChevronDown
                  class="text-muted-foreground size-3.5 transition-transform group-open/exercise:rotate-180"
                />
              </span>
            </summary>
            <div class="border-t pt-4">
              <ExerciseGuide
                :exercise="exercise"
                :swappable="swappableIds.has(exercise.id)"
                @swap="emit('swap', exercise.id)"
              />
            </div>
          </details>
        </div>
      </template>
    </div>

    <p class="text-muted-foreground text-xs leading-5">
      Tap an exercise for its demonstration, setup and form checks.
    </p>
  </section>
</template>
