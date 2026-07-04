// ── Scheduler — fundamentool ────────────────────────────────────────────────
// На основе lovely-bot.node-app/src/actions-calendar-provider.js
// Документо-ориентированное хранение: важные поля — колонки, остальное — JSON.
// Scheduler принимает ISchedulerStore и сам управляет своими данными.

import type { ScheduledEvent, ScheduleTime, TriggerOffset, WeekDay } from './types';
export type { ScheduledEvent, ScheduleTime, TriggerOffset, WeekDay } from './types';

// ── Helpers ──────────────────────────────────────────────────────────────────

export function nextScheduleTime(schedule: ScheduleTime, from: Date): Date {
  const next = new Date(from);
  next.setUTCSeconds(0, 0);

  if ('at' in schedule) return new Date(schedule.at);

  if ('everyMinutes' in schedule) {
    const elapsed = from.getTime() % (schedule.everyMinutes * 60_000);
    next.setTime(from.getTime() - elapsed + schedule.everyMinutes * 60_000);
    return next;
  }

  if ('daily' in schedule) {
    const todayMin = from.getUTCHours() * 60 + from.getUTCMinutes();
    let best: { hour: number; minute: number } | null = null;
    let bestDelta = Infinity;
    let tomorrow = false;
    for (const t of schedule.daily) {
      const m = t.hour * 60 + t.minute;
      let delta = m - todayMin;
      if (delta <= 0) delta += 24 * 60;
      if (delta < bestDelta) { bestDelta = delta; best = t; tomorrow = m <= todayMin; }
    }
    if (!best) return new Date(Date.now() + 365 * 24 * 60 * 60_000);
    next.setUTCHours(best.hour, best.minute, 0, 0);
    if (tomorrow) next.setUTCDate(next.getUTCDate() + 1);
    return next;
  }

  if ('everyWeek' in schedule) {
    const targetDow = schedule.weekDay;
    const currentDow = from.getUTCDay();
    const weekStart = new Date(from);
    weekStart.setUTCDate(from.getUTCDate() - currentDow);
    weekStart.setUTCHours(0, 0, 0, 0);

    let daysFromSunday = targetDow;
    const todayMin = from.getUTCHours() * 60 + from.getUTCMinutes();
    const targetMin = schedule.hour * 60 + schedule.minute;
    if (targetDow < currentDow || (targetDow === currentDow && todayMin >= targetMin)) {
      daysFromSunday += 7;
    }
    next.setTime(weekStart.getTime());
    next.setUTCDate(weekStart.getUTCDate() + daysFromSunday);
    next.setUTCHours(schedule.hour, schedule.minute, 0, 0);

    if (schedule.everyWeek > 1) {
      const weekMs = 7 * 24 * 60 * 60_000;
      const nextMs = next.getTime();
      const diffWeeks = Math.floor((nextMs - weekStart.getTime()) / weekMs);
      const remainder = diffWeeks % schedule.everyWeek;
      if (remainder !== 0) next.setTime(nextMs + (schedule.everyWeek - remainder) * weekMs);
    }
    return next;
  }

  return new Date(Date.now() + 365 * 24 * 60 * 60_000);
}

export function applyOffset(baseTime: Date, offset: TriggerOffset): Date {
  const d = new Date(baseTime);
  if ('before' in offset) {
    const { minutes = 0, hours = 0, days = 0 } = offset.before;
    d.setTime(d.getTime() - ((days * 24 + hours) * 60 + minutes) * 60_000);
    return d;
  }
  if ('sameDay' in offset) {
    d.setUTCHours(offset.sameDay.hour, offset.sameDay.minute, 0, 0);
    return d;
  }
  if ('sameWeek' in offset) {
    const targetDow = offset.sameWeek.weekDay;
    const currentDow = baseTime.getUTCDay();
    d.setUTCDate(d.getUTCDate() - currentDow + targetDow);
    d.setUTCHours(offset.sameWeek.hour, offset.sameWeek.minute, 0, 0);
    if (d <= baseTime) d.setUTCDate(d.getUTCDate() + 7);
    return d;
  }
  return d;
}

// ── Store types ──────────────────────────────────────────────────────────────

export interface SchedulerRecord {
  id: string;
  parentId: string | null;
  scheduleJson: string | null;
  offsetJson: string | null;
  actionPrompt: string;
  nextRunAt: number;
  lastFiredAt: number;
  scope?: string;
}

export interface ISchedulerStore {
  getDueEvents(now: Date): Promise<SchedulerRecord[]>;
  markFired(id: string, firedAt: Date, nextRunAt: Date): Promise<void>;
  upsertEvents(events: ScheduledEvent[], scope?: string): Promise<void>;
  removeEvent(id: string): Promise<void>;
  getById(id: string): Promise<SchedulerRecord | undefined>;
}

// ── Expand nested → flat records ─────────────────────────────────────────────

function expandEvents(events: ScheduledEvent[], scope?: string): SchedulerRecord[] {
  const result: SchedulerRecord[] = [];
  const now = new Date();

  for (const ev of events) {
    if (!ev.schedule) continue;
    const id = scope ? `${scope}:${ev.name}` : ev.name;
    const scheduleJson = JSON.stringify(ev.schedule);
    const nextRunAt = nextScheduleTime(ev.schedule, now).getTime();

    result.push({ id, parentId: null, scheduleJson, offsetJson: null, actionPrompt: ev.actionPrompt, nextRunAt, lastFiredAt: 0, scope });

    if (ev.childs) {
      for (const child of ev.childs) {
        if (!child.offset) continue;
        const childId = `${id}:${child.name}`;
        const baseTime = nextScheduleTime(ev.schedule, now);
        const childTime = applyOffset(baseTime, child.offset);
        result.push({ id: childId, parentId: id, scheduleJson: null, offsetJson: JSON.stringify(child.offset), actionPrompt: child.actionPrompt, nextRunAt: childTime.getTime(), lastFiredAt: 0, scope });
      }
    }
  }
  return result;
}

// ── Scheduler ────────────────────────────────────────────────────────────────

export interface SchedulerCallbacks {
  onFire: (record: SchedulerRecord, date: Date) => void | Promise<void>;
  onError?: (record: SchedulerRecord, err: Error) => void;
}

export class Scheduler {
  private store: ISchedulerStore;
  private callbacks: SchedulerCallbacks | null = null;
  private timer: ReturnType<typeof setInterval> | null = null;
  private checkIntervalMs: number;
  private cooldownMs: number;

  constructor(store: ISchedulerStore, checkIntervalMs = 30_000, cooldownMs = 55_000) {
    this.store = store;
    this.checkIntervalMs = checkIntervalMs;
    this.cooldownMs = cooldownMs;
  }

  async setEvents(events: ScheduledEvent[], scope?: string): Promise<void> {
    await this.store.upsertEvents(events, scope);
  }

  start(callbacks: SchedulerCallbacks): void {
    this.callbacks = callbacks;
    if (this.timer) return;
    this.timer = setInterval(() => this.tick(), this.checkIntervalMs);
  }

  stop(): void { if (this.timer) { clearInterval(this.timer); this.timer = null; } }

  async tickNow(): Promise<void> { await this.tick(); }

  private async tick(): Promise<void> {
    if (!this.callbacks) return;
    const now = new Date();
    const nowMs = now.getTime();

    try {
      const due = await this.store.getDueEvents(now);
      for (const rec of due) {
        if (nowMs - rec.lastFiredAt < this.cooldownMs) continue;

        let nextRunAt: number;
        if (rec.parentId && rec.offsetJson) {
          const parent = await this.store.getById(rec.parentId);
          if (parent?.scheduleJson) {
            const ps = JSON.parse(parent.scheduleJson) as ScheduleTime;
            const off = JSON.parse(rec.offsetJson) as TriggerOffset;
            nextRunAt = applyOffset(nextScheduleTime(ps, now), off).getTime();
          } else {
            nextRunAt = nowMs + 24 * 60 * 60_000;
          }
        } else if (rec.scheduleJson) {
          nextRunAt = nextScheduleTime(JSON.parse(rec.scheduleJson) as ScheduleTime, now).getTime();
        } else {
          nextRunAt = nowMs + 24 * 60 * 60_000;
        }

        await this.store.markFired(rec.id, now, new Date(nextRunAt));

        try {
          const r = this.callbacks.onFire(rec, now);
          if (r instanceof Promise) r.catch(err => this.callbacks?.onError?.(rec, err as Error));
        } catch (err) { this.callbacks?.onError?.(rec, err as Error); }
      }
    } catch (err) {
      this.callbacks?.onError?.({ id: '__tick__', parentId: null, scheduleJson: null, offsetJson: null, actionPrompt: '', nextRunAt: 0, lastFiredAt: 0 }, err as Error);
    }
  }
}
