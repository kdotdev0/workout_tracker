import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { demos } from './demos';
import { guides } from './guides';
import { workouts } from './programme';
import { canonicalExerciseId } from './exercise-identity';
import vimeoSources from './vimeo-sources.json';
import youtubeSources from './youtube-sources.json';

const exercises = Object.values(workouts).flatMap((workout) => workout.exercises);
const currentIds = new Set(exercises.map((exercise) => exercise.id));
const alternativeIds = new Set(
  exercises.map((exercise) => canonicalExerciseId(exercise.alternative.movement!.id)),
);

describe('exercise video demonstrations', () => {
  it('covers every current movement, every available swap and retained historical guide', () => {
    for (const id of [...currentIds, ...alternativeIds, ...Object.keys(guides)]) {
      expect(demos[id], id).toBeDefined();
    }
    const known = new Set([...currentIds, ...alternativeIds, ...Object.keys(guides)]);
    expect(Object.keys(demos).filter((id) => !known.has(id))).toEqual([]);
  });

  it('records duration, matching posters and credits for every real-footage video', () => {
    for (const demo of Object.values(demos)) {
      expect(demo).toBeDefined();
      expect(demo!.durationSeconds).toBeGreaterThan(0);
      expect(demo!.durationSeconds).toBeLessThanOrEqual(120);
      expect(demo!.credit.trim()).not.toBe('');
      expect(new URL(demo!.creditUrl).protocol).toBe('https:');
      if (demo!.match === 'related') expect(demo!.difference.trim()).not.toBe('');
      if (demo!.kind === 'file') {
        expect(demo!.src).toMatch(/^demos\/[a-z-]+\.mp4$/);
        expect(existsSync(resolve('public', demo!.src))).toBe(true);
        expect(demo!.poster).toBe(demo!.src.replace('.mp4', '.jpg'));
        expect(existsSync(resolve('public', demo!.poster))).toBe(true);
        expect(new URL(demo!.licenceUrl).protocol).toBe('https:');
      } else if (demo!.kind === 'vimeo') {
        expect(demo!.videoId).toMatch(/^\d+$/);
        const source = vimeoSources[demo!.videoId as keyof typeof vimeoSources];
        expect(source).toBeDefined();
        expect(demo!.poster).toBe(source.poster);
        expect(demo!.creditUrl).toBe(`https://vimeo.com/${demo!.videoId}`);
        expect(demo!.durationSeconds).toBe(source.durationSeconds);
        expect(demo!.credit).toContain(source.author);
        expect(demo!.credit).toContain(source.title);
        expect(new URL(demo!.poster).hostname).toBe('i.vimeocdn.com');
      } else {
        expect(demo!.kind).toBe('youtube');
        expect(demo!.videoId).toMatch(/^[\w-]{11}$/);
        const source = youtubeSources[demo!.videoId as keyof typeof youtubeSources];
        expect(source).toBeDefined();
        expect(demo!.poster).toBe(source.poster);
        expect(demo!.creditUrl).toBe(`https://www.youtube.com/watch?v=${demo!.videoId}`);
        expect(demo!.durationSeconds).toBe(source.durationSeconds);
        expect(demo!.credit).toContain(source.author);
        expect(demo!.credit).toContain(source.title);
        expect(new URL(demo!.poster).hostname).toBe('i.ytimg.com');
      }
    }
  });

  it('uses real footage for machine flies, pulldowns, leg extensions, split squats and forearms', () => {
    expect(demos['barbell-romanian-deadlift']!.credit).toContain('Barbell Romanian Deadlift');
    expect(demos['machine-pec-fly']).toMatchObject({ kind: 'vimeo', videoId: '223935831' });
    expect(demos['machine-reverse-fly']).toMatchObject({ kind: 'vimeo', videoId: '223935802' });
    expect(demos['unica-lat-pulldown']).toMatchObject({
      kind: 'file',
      src: 'demos/lat-pulldown.mp4',
    });
    expect(demos['selection-leg-extension']).toMatchObject({
      kind: 'file',
      src: 'demos/leg-extension.mp4',
    });
    expect(demos['supported-db-stationary-split-squat']).toMatchObject({
      kind: 'file',
      src: 'demos/split-squat.mp4',
    });
    for (const id of [
      'incline-db-curl',
      'db-wrist-curl',
      'db-reverse-wrist-curl',
      'db-reverse-curl',
    ]) {
      expect(demos[id]?.kind).toBe('youtube');
    }
  });

  it('retains honest pause and machine-model differences', () => {
    for (const id of ['paused-barbell-bench-press', 'paused-barbell-squat']) {
      const demo = demos[id]!;
      expect(demo.match).toBe('related');
      if (demo.match === 'related') expect(demo.difference).toContain('Pause not shown');
    }
    for (const id of ['unica-seated-row', 'unica-lat-pulldown', 'selection-leg-extension']) {
      const demo = demos[id]!;
      expect(demo.match).toBe('related');
      if (demo.match === 'related') expect(demo.difference).toMatch(/UNICA|Selection/);
    }
  });
});
