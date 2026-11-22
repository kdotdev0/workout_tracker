<script setup lang="ts">
import { computed, nextTick, shallowRef, useTemplateRef } from 'vue';
import { ArrowLeft, BellRing, ChevronLeft, ChevronRight, Timer } from '@lucide/vue';
import { useIntersectionObserver } from '@vueuse/core';
import { formatDate } from '@/domain/dates';
import { workouts } from '@/domain/programme';
import { isExerciseComplete, sessionProgress } from '@/domain/sessions';
import type { Session, SetLog } from '@/domain/state';
import { Button } from '@/components/ui/button';
import {
  DialogRoot,
  DialogPortal,
  DialogOverlay,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from 'reka-ui';
import RestTimer from '@/components/session/RestTimer.vue';
import SessionExercise from '@/components/session/SessionExercise.vue';
import ExerciseProgress from '@/components/session/ExerciseProgress.vue';

const props = defineProps<{
  session: Session;
  history: Session[];
  restMinutes: number | null;
  busy: boolean;
  timerDisplay: string;
  timerDone: boolean;
  timerVisible: boolean;
  timerFraction: number;
}>();
const emit = defineEmits<{
  back: [];
  record: [exerciseId: string, log: SetLog];
  swap: [exerciseId: string];
  finish: [];
  stopTimer: [];
  adjustTimer: [seconds: number];
}>();

// Resume at the first unfinished exercise; progress is shared with Plan and History.
const firstOpen = props.session.exercises.findIndex((item) => !isExerciseComplete(item));
const selected = shallowRef(firstOpen === -1 ? props.session.exercises.length - 1 : firstOpen);
const confirmingFinish = shallowRef(false);
const entry = computed(() => props.session.exercises[selected.value]!);
const progress = computed(() => sessionProgress(props.session));
const allDone = computed(() => progress.value.done === progress.value.total);
const setsLogged = computed(() =>
  props.session.exercises.reduce((total, item) => total + item.logs.length, 0),
);
// Start to last saved set; a session resumed on another day has no meaningful length.
const minutesTrained = computed(() => {
  const times = props.session.exercises.flatMap((item) => item.logs.map((log) => log.loggedAt));
  if (!times.length) return null;
  const last = Math.max(...times.map((time) => Date.parse(time)));
  const minutes = Math.round((last - Date.parse(props.session.startedAt)) / 60000);
  return minutes > 0 && minutes < 240 ? minutes : null;
});
const exerciseContent = useTemplateRef<HTMLElement>('exerciseContent');
const timerBox = useTemplateRef<HTMLElement>('timerBox');
const timerInView = shallowRef(true);
useIntersectionObserver(timerBox, ([entry]) => {
  timerInView.value = entry?.isIntersecting ?? true;
});

async function selectExercise(index: number) {
  if (index === selected.value) return;
  selected.value = index;
  await nextTick();
  exerciseContent.value?.scrollIntoView?.({ block: 'start' });
  exerciseContent.value?.focus({ preventScroll: true });
}
</script>

<template>
  <div class="flex flex-col gap-3">
    <div class="flex flex-wrap items-center justify-between gap-2">
      <Button variant="ghost" class="-ml-[12px]" @click="emit('back')"
        ><ArrowLeft />Back to plan</Button
      >
      <span class="text-muted-foreground text-right text-xs">
        {{ formatDate(session.date, { weekday: 'short', day: 'numeric', month: 'short' }) }} ·
        {{ workouts[session.workoutId].name }}
      </span>
    </div>
    <div class="flex flex-col gap-2">
      <div class="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <span class="text-muted-foreground text-xs"
          >Exercise {{ selected + 1 }} of {{ session.exercises.length }}</span
        >
        <span class="text-xs font-medium whitespace-nowrap tabular-nums"
          >{{ progress.done }}/{{ progress.total }} exercises done</span
        >
      </div>
      <ExerciseProgress
        :exercises="session.exercises"
        :selected="selected"
        @select="selectExercise"
      />
    </div>
  </div>

  <section
    ref="exerciseContent"
    class="outline-none"
    aria-labelledby="active-exercise-title"
    tabindex="-1"
  >
    <SessionExercise
      :key="entry.exercise.id"
      :entry="entry"
      :session="session"
      :history="history"
      :rest-minutes="restMinutes"
      :busy="busy"
      @record="(exerciseId, log) => emit('record', exerciseId, log)"
      @swap="emit('swap', $event)"
    >
      <template #rest-timer>
        <div v-if="timerVisible" ref="timerBox">
          <RestTimer
            :display="timerDisplay"
            :done="timerDone"
            :busy="busy"
            :fraction="timerFraction"
            @dismiss="emit('stopTimer')"
            @adjust="emit('adjustTimer', $event)"
          />
        </div>
      </template>
      <template #navigation>
        <Button
          v-if="allDone"
          size="lg"
          class="hero-action w-full text-base"
          :disabled="busy"
          @click="confirmingFinish = true"
          >Finish workout</Button
        >
        <nav class="grid grid-cols-2 gap-2" aria-label="Exercise navigation">
          <Button variant="outline" :disabled="selected === 0" @click="selectExercise(selected - 1)"
            ><ChevronLeft />Previous</Button
          >
          <Button
            variant="outline"
            :disabled="selected === session.exercises.length - 1"
            @click="selectExercise(selected + 1)"
            >Next exercise<ChevronRight
          /></Button>
        </nav>
      </template>
    </SessionExercise>
  </section>

  <section v-if="!allDone" class="flex flex-col gap-3 border-t pt-5">
    <Button
      variant="outline"
      size="lg"
      class="rounded-2xl"
      :disabled="busy || !setsLogged"
      @click="confirmingFinish = true"
    >
      Finish workout
    </Button>
  </section>

  <button
    v-if="timerVisible && !timerInView"
    type="button"
    :class="[
      'timer-pill surface-edge font-display tabular-nums',
      timerDone ? 'text-coral' : 'text-foreground',
    ]"
    :aria-label="timerDone ? 'Rest complete, show timer' : `Rest ${timerDisplay}, show timer`"
    @click="timerBox?.scrollIntoView({ block: 'center', behavior: 'smooth' })"
  >
    <BellRing v-if="timerDone" class="size-4" /><Timer v-else class="text-primary size-4" />{{
      timerDone ? 'Ready' : timerDisplay
    }}
  </button>

  <DialogRoot v-model:open="confirmingFinish">
    <DialogPortal>
      <DialogOverlay class="fixed inset-0 z-50 bg-black/70 backdrop-blur-[2px]" />
      <DialogContent
        class="bg-card surface-edge fixed top-1/2 left-1/2 z-50 flex w-[calc(100%-32px)] max-w-sm -translate-x-1/2 -translate-y-1/2 flex-col gap-3 rounded-2xl p-5 shadow-2xl outline-none"
      >
        <DialogTitle class="text-lg font-semibold">
          {{ allDone ? `${workouts[session.workoutId].name} done` : 'End workout early?' }}
        </DialogTitle>
        <DialogDescription class="text-muted-foreground text-sm leading-6">
          {{
            allDone
              ? 'Every exercise is logged. Nice work.'
              : 'Exercises you skipped stay open; this is saved as a partial workout.'
          }}
        </DialogDescription>
        <dl class="bg-secondary grid grid-cols-3 gap-2 rounded-xl p-3 text-center">
          <div class="flex flex-col-reverse gap-1">
            <dt class="text-muted-foreground text-xs">exercises</dt>
            <dd class="font-display text-xl font-semibold tabular-nums">
              {{ progress.done }}/{{ progress.total }}
            </dd>
          </div>
          <div class="flex flex-col-reverse gap-1">
            <dt class="text-muted-foreground text-xs">{{ setsLogged === 1 ? 'set' : 'sets' }}</dt>
            <dd class="font-display text-xl font-semibold tabular-nums">{{ setsLogged }}</dd>
          </div>
          <div class="flex flex-col-reverse gap-1">
            <dt class="text-muted-foreground text-xs">minutes</dt>
            <dd class="font-display text-xl font-semibold tabular-nums">
              {{ minutesTrained ?? '–' }}
            </dd>
          </div>
        </dl>
        <div v-if="allDone" class="mt-1 grid grid-cols-[repeat(auto-fit,minmax(8.5rem,1fr))] gap-2">
          <Button variant="outline" size="lg" :disabled="busy" @click="confirmingFinish = false">
            Keep training
          </Button>
          <Button size="lg" :disabled="busy" @click="emit('finish')">Finish workout</Button>
        </div>
        <div v-else class="mt-1 grid grid-cols-[repeat(auto-fit,minmax(8.5rem,1fr))] gap-2">
          <Button variant="outline" size="lg" :disabled="busy" @click="emit('finish')">
            Finish anyway
          </Button>
          <Button size="lg" :disabled="busy" @click="confirmingFinish = false">
            Keep training
          </Button>
        </div>
      </DialogContent>
    </DialogPortal>
  </DialogRoot>
</template>
