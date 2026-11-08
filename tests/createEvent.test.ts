import {
  createEvent,
} from '../src/createEvent';

describe('createEvent', () => {
  test('calling it hands the payload to its watchers and returns it; watch fires on calls only (D-049)', () => {
    const saved = createEvent<string>();
    const seen: string[] = [];
    const stop = saved.watch((id) => seen.push(id));
    expect(seen).toEqual([]); // nothing at subscription
    expect(saved('a')).toBe('a');
    stop.unsubscribe();
    saved('b');
    expect(seen).toEqual(['a']);
  });

  test('map and filter: events derived from it — each fires when the source does, with its result or not at all', () => {
    const edited = createEvent<string>();
    const seen: string[] = [];
    const docs = edited.filter({
      fn: (file) => file.endsWith('.md'),
    }).map((file) => file.toUpperCase());
    docs.watch((file) => seen.push(file));
    edited('a.ts');
    edited('b.md');
    expect(seen).toEqual(['B.MD']);
  });

  test('filter with a type guard narrows the payload', () => {
    const came = createEvent<string | number>();
    const numbers: number[] = [];
    came.filter({
      fn: (value): value is number => typeof value === 'number',
    }).watch((value) => numbers.push(value + 1));
    came('x');
    came(1);
    expect(numbers).toEqual([2]);
  });

  test('a derived event follows its source only while watched: the last unwatch lets go, the next watch takes it again',
    () => {
      const edited = createEvent<number>();
      const calls: number[] = [];
      const doubled = edited.map((n) => {
        calls.push(n);
        return n * 2;
      });
      edited(1);
      expect(calls).toEqual([]); // unwatched: nothing computed
      const seen: number[] = [];
      const first = doubled.watch((n) => seen.push(n));
      const second = doubled.watch((n) => seen.push(-n));
      edited(2);
      first();
      edited(3);
      second();
      second(); // twice is harmless
      edited(4);
      expect(calls).toEqual([
        2,
        3,
      ]);
      expect(seen).toEqual([
        4,
        -4,
        -6,
      ]);
      doubled.watch((n) => seen.push(n));
      edited(5);
      expect(seen.at(-1)).toBe(10);
    });

  test('prepend: an event that calls this one with its function\'s result — its own watchers hear what it was given',
    () => {
      const saved = createEvent<string>();
      const ids: string[] = [];
      saved.watch((id) => ids.push(id));
      const savedNote = saved.prepend((note: { id: string }) => note.id);
      const notes: string[] = [];
      savedNote.watch((note) => notes.push(note.id));
      expect(savedNote({
        id: 'n1',
      })).toEqual({
        id: 'n1',
      });
      expect(ids).toEqual(['n1']);
      expect(notes).toEqual(['n1']);
    });

  test('a watcher of a derived event that throws is logged; the others still hear', () => {
    const error = jest.spyOn(console, 'error').mockImplementation(() => undefined);
    const came = createEvent<number>();
    const seen: number[] = [];
    const mapped = came.map((n) => n + 1);
    mapped.watch(() => {
      throw new Error('boom');
    });
    mapped.watch((n) => seen.push(n));
    came(1);
    expect(seen).toEqual([2]);
    expect(error).toHaveBeenCalledWith('watchers:error', expect.any(Error));
    error.mockRestore();
  });
});
