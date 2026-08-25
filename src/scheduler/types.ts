// ── Scheduler types — fundamentool ──────────────────────────────────────────
// Вложенная структура для человекочитаемого API.
// В базе данных хранится плоско с parentEvent ссылкой.

/** 0 = воскресенье, 1 = понедельник, ..., 6 = суббота */
export type WeekDay = 0 | 1 | 2 | 3 | 4 | 5 | 6;

/** Абсолютное расписание события */
export type ScheduleTime =
  // «каждые N недель в день недели D в H:M»
  | { everyWeek: number;
    weekDay: WeekDay;
    hour: number;
    minute: number }
  // «каждый день в H:M» (можно несколько)
  | { daily: { hour: number;
    minute: number }[] }
  // «каждые N минут»
  | { everyMinutes: number }
  // Разовый запуск в конкретное время (ISO)
  | { at: string };

/** Смещение относительно родительского schedule */
export type TriggerOffset =
  // «за N минут/часов/дней до события»
  | { before: { minutes?: number;
    hours?: number;
    days?: number } }
  // «в день события в H:M»
  | { sameDay: { hour: number;
    minute: number } }
  // «на неделе события в день D в H:M»
  | { sameWeek: { weekDay: WeekDay;
    hour: number;
    minute: number } };

export interface ScheduledEvent {
  /** Уникальное имя (в рамках родителя) */
  name: string;
  /** Расписание (только для корневых событий) */
  schedule?: ScheduleTime;
  /** Смещение относительно родительского schedule (только для дочерних) */
  offset?: TriggerOffset;
  /** Промпт для LLM при срабатывании */
  actionPrompt: string;
  /** Прямая функция (альтернатива LLM) */
  action?: (date: Date) => void | Promise<void>;
  /** Дочерние триггеры */
  childs?: ScheduledEvent[];
}
