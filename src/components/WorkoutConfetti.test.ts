import { mount } from '@vue/test-utils';
import { afterEach, describe, expect, it, vi } from 'vitest';
import WorkoutConfetti from './WorkoutConfetti.vue';

function mockContext() {
  return {
    setTransform: vi.fn(),
    clearRect: vi.fn(),
    save: vi.fn(),
    restore: vi.fn(),
    translate: vi.fn(),
    rotate: vi.fn(),
    beginPath: vi.fn(),
    arc: vi.fn(),
    fill: vi.fn(),
    fillRect: vi.fn(),
    globalAlpha: 1,
    fillStyle: '',
  } as unknown as CanvasRenderingContext2D;
}

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe('workout completion confetti', () => {
  it('renders a non-interactive canvas, animates particles, and emits done when finished', () => {
    const ctx = mockContext();
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(ctx);
    let now = 0;
    vi.spyOn(performance, 'now').mockImplementation(() => now);
    const frames: FrameRequestCallback[] = [];
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation((callback) => {
      frames.push(callback);
      return frames.length;
    });

    const wrapper = mount(WorkoutConfetti);
    const canvas = wrapper.get('[data-confetti]');
    expect(canvas.attributes('aria-hidden')).toBe('true');
    expect(canvas.classes()).toContain('pointer-events-none');
    expect(frames).toHaveLength(1);

    // Mid-burst frame draws particles.
    now = 300;
    frames.shift()!(now);
    expect(ctx.clearRect).toHaveBeenCalled();
    expect(
      (ctx.fillRect as ReturnType<typeof vi.fn>).mock.calls.length +
        (ctx.fill as ReturnType<typeof vi.fn>).mock.calls.length,
    ).toBeGreaterThan(0);
    expect(wrapper.emitted('done')).toBeUndefined();

    // Past the animation duration clears the canvas and signals completion.
    now = 3000;
    frames.shift()!(now);
    expect(wrapper.emitted('done')).toHaveLength(1);
    wrapper.unmount();
  });

  it('respects prefers-reduced-motion by skipping the animation and emitting done immediately', () => {
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
    const raf = vi.spyOn(window, 'requestAnimationFrame');

    const wrapper = mount(WorkoutConfetti);
    expect(raf).not.toHaveBeenCalled();
    expect(wrapper.emitted('done')).toHaveLength(1);
    wrapper.unmount();
  });

  it('cancels animation frames cleanly on unmount', () => {
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(mockContext());
    vi.spyOn(window, 'requestAnimationFrame').mockReturnValue(42);
    const cancel = vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(() => {});

    const wrapper = mount(WorkoutConfetti);
    wrapper.unmount();
    expect(cancel).toHaveBeenCalledWith(42);
  });
});
