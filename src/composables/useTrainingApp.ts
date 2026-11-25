import { computed, nextTick, onMounted, onUnmounted, shallowRef, watch } from 'vue';
import { useEventListener, useIntervalFn } from '@vueuse/core';
import { localDate, shiftDate, validDate } from '../domain/dates';
import { workoutForDate } from '../domain/programme';
import type { WorkoutId } from '../domain/programme-types';
import { finishForgotten, isUntouchedSession, missedWorkout } from '../domain/sessions';
import { workouts as programme } from '../domain/programme';
import type { AppState, Session } from '../domain/state';
import { usePushups } from './usePushups';
import { useRestTimer } from './useRestTimer';
import { useTrainingStore } from './useTrainingStore';
import { useWorkoutSessions } from './useWorkoutSessions';
import { useSupplements } from './useSupplements';

export type View = 'plan' | 'session' | 'history' | 'pushups' | 'supplements' | 'settings';

/** App shell state and feature wiring. Feature writes live in their own composables. */
export function useTrainingApp() {
  const store = useTrainingStore();
  const { state, update } = store;
  const timer = useRestTimer({ state, update });
  const view = shallowRef<View>('plan');
  const today = shallowRef(localDate());
  const date = shallowRef(today.value);
  const override = shallowRef<WorkoutId | null | undefined>(undefined);
  const sessionId = shallowRef<string | null>(null);
  const message = shallowRef('');

  // A workout logged on this day wins over the weekly template, so a switch sticks.
  const workoutId = computed(() => {
    if (override.value !== undefined) return override.value;
    const logged = state.value.sessions.filter((session) => session.date === date.value);
    const chosen = logged.find((session) => session.status === 'active') ?? logged.at(-1);
    return chosen?.workoutId ?? workoutForDate(date.value);
  });
  const sessionsHere = computed(() =>
    state.value.sessions.filter(
      (session) => session.date === date.value && session.workoutId === workoutId.value,
    ),
  );
  const draft = computed(
    () => sessionsHere.value.find((session) => session.status === 'active') ?? null,
  );
  const completed = computed(
    () => sessionsHere.value.findLast((session) => session.status === 'completed') ?? null,
  );
  const doneDates = computed(
    () =>
      new Set(
        state.value.sessions
          .filter((session) => session.status === 'completed')
          .map((session) => session.date),
      ),
  );
  const currentSession = computed(
    () => state.value.sessions.find((session) => session.id === sessionId.value) ?? null,
  );
  // The research plan runs the introduction for about two weeks before full volume.
  const readyForBaseline = computed(() => {
    if (state.value.settings.phase !== 'intro') return false;
    const first = state.value.sessions
      .filter((session) => session.phase === 'intro')
      .map((session) => session.date)
      .sort()[0];
    const finished = state.value.sessions.filter(
      (session) => session.phase === 'intro' && session.status === 'completed',
    ).length;
    // Two weeks on the calendar and about that much actual training.
    return first !== undefined && today.value >= shiftDate(first, 14) && finished >= 6;
  });
  // Today only, before anything is logged: offer a workout skipped earlier this week.
  const missed = computed(() => {
    if (date.value !== today.value) return null;
    if (state.value.sessions.some((session) => session.date === date.value)) return null;
    const id = missedWorkout(state.value.sessions, date.value);
    return id === workoutId.value ? null : id;
  });
  let hideMessage: ReturnType<typeof setTimeout> | undefined;
  /** Shows a short confirmation toast that hides itself. */
  function notify(text: string) {
    clearTimeout(hideMessage);
    message.value = text;
    hideMessage = setTimeout(() => (message.value = ''), 3000);
  }
  function dismissMessage() {
    clearTimeout(hideMessage);
    message.value = '';
  }

  const pushups = usePushups({ state, today, update, notify });
  const supplements = useSupplements({ state, date, update, notify });
  const workouts = useWorkoutSessions({
    state,
    date,
    workoutId,
    draft,
    currentSession,
    update,
    notify,
    open,
    onFinished: () => {
      view.value = 'history';
    },
  });

  // Catch midnight while open and refresh immediately when a suspended phone app resumes.
  function refreshCalendarDay() {
    const now = localDate();
    if (document.visibilityState !== 'visible' || now === today.value) return;
    if (date.value === today.value) changeDate(now);
    today.value = now;
  }
  useEventListener(document, 'visibilitychange', refreshCalendarDay);
  useIntervalFn(refreshCalendarDay, 30_000);

  onMounted(async () => {
    await store.load();
    const { sessions, finished } = finishForgotten(state.value.sessions);
    if (finished.length && (await update((current) => ({ ...current, sessions }))))
      notify(
        `Finished ${finished.map((session) => programme[session.workoutId].name).join(', ')} you left open.`,
      );
  });
  onUnmounted(() => clearTimeout(hideMessage));
  watch(view, () => {
    dismissMessage();
    window.scrollTo({ top: 0, behavior: 'instant' });
  });

  function changeDate(value: string) {
    if (!validDate(value)) return;
    date.value = value;
    override.value = undefined;
  }
  function chooseWorkout(id: WorkoutId | null) {
    override.value = id;
  }
  function open(id: string) {
    sessionId.value = id;
    view.value = 'session';
  }
  async function saveSettings(settings: AppState['settings']) {
    // An untouched draft follows a phase change; drafts with logged sets keep their targets.
    const stale = (session: Session) =>
      isUntouchedSession(session) && session.phase !== settings.phase;
    if (
      await update((current) => ({
        ...current,
        settings,
        sessions: current.sessions.filter((session) => !stale(session)),
      }))
    )
      notify('Settings saved. Logged sets are unchanged.');
  }
  async function restore(imported: AppState) {
    if (await update(() => ({ ...imported, timer: null }))) {
      sessionId.value = null;
      override.value = undefined;
      view.value = 'plan';
      await nextTick(); // let the view change clear the old message first
      notify('Backup restored on this device.');
    }
  }

  return {
    ...store,
    timer,
    view,
    today,
    date,
    workoutId,
    draft,
    completed,
    doneDates,
    currentSession,
    readyForBaseline,
    missed,
    message,
    dismissMessage,
    changeDate,
    chooseWorkout,
    open,
    saveSettings,
    restore,
    stopTimer: timer.stop,
    adjustTimer: timer.adjust,
    timerFraction: timer.fraction,
    ...workouts,
    ...supplements,
    ...pushups,
  };
}
