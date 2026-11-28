import { mount } from '@vue/test-utils';
import { afterEach, describe, expect, it, vi } from 'vitest';
import confetti from 'canvas-confetti';
import WorkoutConfetti from './WorkoutConfetti.vue';

vi.mock('canvas-confetti', () => ({
  default: {
    create: vi.fn(),
  },
}));

afterEach(() => {
  vi.clearAllMocks();
  vi.unstubAllGlobals();
  vi.useRealTimers();
  document.body.innerHTML = '';
});

describe('workout completion confetti', () => {
  it('teleports a non-interactive canvas to body, fires bursts via canvas-confetti, and emits done', async () => {
    vi.useFakeTimers();
    const resolvers: Array<() => void> = [];
    const fire = Object.assign(
      vi.fn(
        () =>
          new Promise<null>((resolve) => {
            resolvers.push(() => resolve(null));
          }),
      ),
      { reset: vi.fn() },
    );
    vi.mocked(confetti.create).mockReturnValue(fire);

    const wrapper = mount(WorkoutConfetti);
    const canvas = document.body.querySelector<HTMLCanvasElement>('[data-confetti]');
    expect(canvas).not.toBeNull();
    expect(canvas!.getAttribute('aria-hidden')).toBe('true');
    expect(canvas!.classList.contains('pointer-events-none')).toBe(true);
    expect(confetti.create).toHaveBeenCalledWith(canvas, { resize: true, useWorker: false });
    // Dual side cannons fire immediately.
    expect(fire).toHaveBeenCalledTimes(2);
    expect(wrapper.emitted('done')).toBeUndefined();

    // Delayed center burst fires after 160 ms.
    await vi.advanceTimersByTimeAsync(160);
    expect(fire).toHaveBeenCalledTimes(3);

    // Resolving all bursts signals completion.
    for (const resolve of resolvers) resolve();
    await vi.waitFor(() => expect(wrapper.emitted('done')).toHaveLength(1));

    wrapper.unmount();
    expect(fire.reset).toHaveBeenCalledTimes(1);
  });

  it('respects prefers-reduced-motion by skipping canvas-confetti and emitting done immediately', () => {
    vi.stubGlobal(
      'matchMedia',
      vi.fn().mockImplementation(
        (query: string) =>
          ({
            matches: query.includes('prefers-reduced-motion: reduce'),
            media: query,
            onchange: null,
            addListener: vi.fn(),
            removeListener: vi.fn(),
            addEventListener: vi.fn(),
            removeEventListener: vi.fn(),
            dispatchEvent: vi.fn(),
          }) as unknown as MediaQueryList,
      ),
    );

    const wrapper = mount(WorkoutConfetti);
    expect(confetti.create).not.toHaveBeenCalled();
    expect(wrapper.emitted('done')).toHaveLength(1);
    wrapper.unmount();
  });

  it('resets the confetti instance cleanly when unmounted mid-burst', () => {
    const fire = Object.assign(
      vi.fn(() => new Promise<null>(() => {})),
      { reset: vi.fn() },
    );
    vi.mocked(confetti.create).mockReturnValue(fire);

    const wrapper = mount(WorkoutConfetti);
    wrapper.unmount();
    expect(fire.reset).toHaveBeenCalledTimes(1);
  });
});
