/**
 * The scheduler's remaining paths: schedules without an answer (an empty daily list, an unknown kind), every N weeks,
 * offsets in the same week, and the polling loop — cooldown, offset children, failures reported.
 */
import {
  applyOffset,
  nextScheduleTime,
  Scheduler,
} from '../src/scheduler';
import type {
  ISchedulerStore,
  SchedulerRecord,
} from '../src/scheduler';

const YEAR_MS = 365 * 24 * 60 * 60_000;

/** A record with the given fields. */
const record = (fields: Partial<SchedulerRecord>): SchedulerRecord => ({
  id: 'r',
  parentId: null,
  scheduleJson: null,
  offsetJson: null,
  actionPrompt: 'do',
  nextRunAt: 0,
  lastFiredAt: 0,
  ...fields,
});

/** A store over a list of records; `fired` — what it was told. */
function store(records: SchedulerRecord[], extra: Partial<ISchedulerStore> = {}) {
  const fired: [string, number][] = [];
  const port: ISchedulerStore = {
    getDueEvents: async () => records,
    markFired: async (
      id, _at, next,
    ) => {
      fired.push([
        id,
        next.getTime(),
      ]);
    },
    upsertEvents: async () => undefined,
    removeEvent: async () => undefined,
    getById: async (id) => records.find((item) => item.id === id),
    ...extra,
  };
  return {
    port,
    fired,
  };
}

describe('scheduler — the remaining paths', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-01-07T10:00:00Z')); // a Wednesday
  });
  afterEach(() => {
    jest.useRealTimers();
  });

  it('nextScheduleTime: an empty daily list and an unknown kind — a year ahead; every 2 weeks moves to the right week', () => {
    const from = new Date('2026-01-07T10:00:00Z');
    expect(nextScheduleTime({
      daily: [],
    }, from).getTime()).toBe(Date.now() + YEAR_MS);
    expect(nextScheduleTime({} as never, from).getTime()).toBe(Date.now() + YEAR_MS);
    // Friday every 2 weeks: the coming Friday is week 0 — already on the cycle
    expect(nextScheduleTime({
      everyWeek: 2,
      weekDay: 5,
      hour: 9,
      minute: 0,
    }, from).toISOString()).toBe('2026-01-09T09:00:00.000Z');
    // Monday every 2 weeks: the next Monday is in week 1 — moved one week on
    expect(nextScheduleTime({
      everyWeek: 2,
      weekDay: 1,
      hour: 9,
      minute: 0,
    }, from).toISOString()).toBe('2026-01-19T09:00:00.000Z');
  });

  it('applyOffset: the same week (this week, or the next when it has passed); an unknown kind changes nothing', () => {
    const base = new Date('2026-01-07T10:00:00Z');
    expect(applyOffset(base, {
      sameWeek: {
        weekDay: 5,
        hour: 8,
        minute: 0,
      },
    }).toISOString()).toBe('2026-01-09T08:00:00.000Z');
    expect(applyOffset(base, {
      sameWeek: {
        weekDay: 1,
        hour: 8,
        minute: 0,
      },
    }).toISOString()).toBe('2026-01-12T08:00:00.000Z');
    expect(applyOffset(base, {} as never).getTime()).toBe(base.getTime());
  });

  it('the loop: started once, ticks on its interval; nothing before start; a cooldown skips; offset children and plain records', async () => {
    const now = Date.now();
    const parent = record({
      id: 'p',
      scheduleJson: JSON.stringify({
        everyMinutes: 60,
      }),
    });
    const records = [
      parent,
      record({
        id: 'child',
        parentId: 'p',
        offsetJson: JSON.stringify({
          before: {
            minutes: 10,
          },
        }),
      }),
      record({
        id: 'orphan',
        parentId: 'gone',
        offsetJson: JSON.stringify({
          before: {
            minutes: 10,
          },
        }),
      }),
      record({
        id: 'bare',
      }),
      record({
        id: 'recent',
        lastFiredAt: now - 1000,
      }),
    ];
    const {
      port, fired,
    } = store(records);
    const scheduler = new Scheduler(port, 1000);
    await scheduler.tickNow(); // no callbacks yet: nothing
    expect(fired).toEqual([]);
    const onFire = jest.fn();
    scheduler.start({
      onFire,
    });
    scheduler.start({
      onFire,
    }); // already running
    await jest.advanceTimersByTimeAsync(1000);
    expect(fired.map(([id]) => id)).toEqual([
      'p',
      'child',
      'orphan',
      'bare',
    ]); // 'recent' — in its cooldown
    const at = Object.fromEntries(fired);
    expect(at.p).toBe(new Date('2026-01-07T11:00:00Z').getTime());
    expect(at.child).toBe(new Date('2026-01-07T10:50:00Z').getTime());
    const tick = now + 1000; // the first tick, one interval in
    expect(at.orphan).toBe(tick + 24 * 60 * 60_000);
    expect(at.bare).toBe(tick + 24 * 60 * 60_000);
    expect(onFire).toHaveBeenCalledTimes(4);
    scheduler.stop();
    scheduler.stop(); // not running: nothing
  });

  it('failures go to onError: onFire throwing or rejecting, the store failing (as the tick\'s own record)', async () => {
    const errors: [string, string][] = [];
    const onError = (rec: SchedulerRecord, error: Error) => errors.push([
      rec.id,
      error.message,
    ]);
    const {
      port,
    } = store([
      record({
        id: 'sync',
      }),
      record({
        id: 'async',
      }),
    ]);
    const scheduler = new Scheduler(port);
    scheduler.start({
      onFire: (rec) => {
        if (rec.id === 'sync') {
          throw new Error('boom');
        }
        return Promise.reject(new Error('later'));
      },
      onError,
    });
    await scheduler.tickNow();
    await Promise.resolve();
    expect(errors).toEqual([
      [
        'sync',
        'boom',
      ],
      [
        'async',
        'later',
      ],
    ]);
    const broken = new Scheduler(store([], {
      getDueEvents: async () => {
        throw new Error('db down');
      },
    }).port);
    broken.start({
      onFire: () => undefined,
      onError,
    });
    await broken.tickNow();
    expect(errors[2]).toEqual([
      '__tick__',
      'db down',
    ]);
    // Without onError a failure is simply dropped
    const quiet = new Scheduler(store([
      record({
        id: 'x',
      }),
    ]).port);
    quiet.start({
      onFire: () => {
        throw new Error('ignored');
      },
    });
    await quiet.tickNow();
    scheduler.stop();
    broken.stop();
    quiet.stop();
  });
});
