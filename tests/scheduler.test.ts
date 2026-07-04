import { nextScheduleTime, applyOffset, Scheduler } from '../src/scheduler';
import type { ScheduledEvent, ScheduleTime, ISchedulerStore, SchedulerRecord } from '../src/scheduler';

describe('nextScheduleTime', () => {
  test('daily: ближайшее время сегодня', () => {
    const from = new Date('2026-06-10T08:30:00Z');
    const s: ScheduleTime = { daily: [{ hour: 9, minute: 0 }, { hour: 12, minute: 0 }] };
    expect(nextScheduleTime(s, from).toISOString()).toBe('2026-06-10T09:00:00.000Z');
  });

  test('daily: на завтра если все прошли', () => {
    const from = new Date('2026-06-10T17:00:00Z');
    const s: ScheduleTime = { daily: [{ hour: 9, minute: 0 }] };
    expect(nextScheduleTime(s, from).toISOString()).toBe('2026-06-11T09:00:00.000Z');
  });

  test('everyWeek: пятница', () => {
    const from = new Date('2026-06-10T10:00:00Z'); // среда
    const s: ScheduleTime = { everyWeek: 1, weekDay: 5, hour: 9, minute: 0 };
    const r = nextScheduleTime(s, from);
    expect(r.getUTCDay()).toBe(5);
    expect(r.getUTCHours()).toBe(9);
  });

  test('everyMinutes', () => {
    const from = new Date('2026-06-10T10:05:30Z');
    expect(nextScheduleTime({ everyMinutes: 15 }, from).toISOString()).toBe('2026-06-10T10:15:00.000Z');
  });

  test('at: разовый', () => {
    expect(nextScheduleTime({ at: '2026-12-25T00:00:00Z' }, new Date()).toISOString()).toBe('2026-12-25T00:00:00.000Z');
  });
});

describe('applyOffset', () => {
  const base = new Date('2026-06-10T09:00:00Z');
  test('before: 10m', () => expect(applyOffset(base, { before: { minutes: 10 } }).toISOString()).toBe('2026-06-10T08:50:00.000Z'));
  test('before: 1h', () => expect(applyOffset(base, { before: { hours: 1 } }).toISOString()).toBe('2026-06-10T08:00:00.000Z'));
  test('sameDay: 7:00', () => { const r = applyOffset(base, { sameDay: { hour: 7, minute: 0 } }); expect(r.getUTCHours()).toBe(7); });
});

describe('Scheduler with store', () => {
  function mockStore(records: SchedulerRecord[] = []): ISchedulerStore {
    let store = [...records];
    return {
      getDueEvents: async () => store.filter(r => r.nextRunAt <= Date.now()),
      markFired: async (id, firedAt, nextRunAt) => {
        const r = store.find(e => e.id === id);
        if (r) { r.lastFiredAt = firedAt.getTime(); r.nextRunAt = nextRunAt.getTime(); }
      },
      upsertEvents: async (events) => {
        // expand and add
        const { expandEvents } = require('../src/scheduler') as any;
        // We can't easily call private functions — test via setEvents
      },
      removeEvent: async () => {},
      getById: async (id) => store.find(r => r.id === id),
    };
  }

  test('setEvents + start + stop', async () => {
    const store = mockStore();
    const s = new Scheduler(store, 60_000, 0);
    const events: ScheduledEvent[] = [{
      name: 'meeting',
      schedule: { everyWeek: 1, weekDay: 3, hour: 9, minute: 0 },
      actionPrompt: 'prompt',
      childs: [{ name: '10m', offset: { before: { minutes: 10 } }, actionPrompt: '10m' }],
    }];
    await s.setEvents(events, 'test');
    s.start({ onFire: () => {} });
    s.stop();
  });

  test('fires due events', async () => {
    const now = Date.now();
    const recs: SchedulerRecord[] = [{
      id: 'test:ev', parentId: null,
      scheduleJson: JSON.stringify({ daily: [{ hour: 0, minute: 0 }] }),
      offsetJson: null, actionPrompt: 'fire!',
      nextRunAt: now - 1000, lastFiredAt: 0, scope: 'test',
    }];
    const fired: string[] = [];
    const store: ISchedulerStore = {
      getDueEvents: async () => recs.filter(r => r.nextRunAt <= Date.now()),
      markFired: async (id) => { fired.push(id); },
      upsertEvents: async () => {},
      removeEvent: async () => {},
      getById: async () => undefined,
    };
    const s = new Scheduler(store, 60_000, 0);
    s.start({ onFire: () => {} });
    await s.tickNow();
    expect(fired).toContain('test:ev');
    s.stop();
  });
});
