import { createLimitedTimeProcess } from '../src/createLimitedTimeProcess';

/** Builds a clock that advances by 1ms on each call. */
function makeClock(start = 0) {
  let t = start;
  return () => ++t;
}

describe('createLimitedTimeProcess', () => {
  // ── Basic ────────────────────────────────────────────────────────────────

  describe('basic processing', () => {
    test('calls processItem for each index in order', () => {
      const visited: number[] = [];
      const proc = createLimitedTimeProcess(3, (index) => visited.push(index), 999, true, makeClock());
      proc();
      expect(visited).toEqual([0, 1, 2]);
    });

    test('passes correct index and dt to processItem', () => {
      // clock ticks: preStart=1, callStart=2, after idx0=3, after idx1=4, after idx2=5
      // lastUpdates after preStart: [1, 1, 1]
      // idx0: dt = 2-1 = 1; idx1: dt = 3-1 = 2; idx2: dt = 4-1 = 3
      const calls: Array<[number, number]> = [];
      const proc = createLimitedTimeProcess(3, (index, dt) => {
        calls.push([index, dt]);
      }, 999, true, makeClock());
      proc();
      expect(calls).toEqual([[0, 1], [1, 2], [2, 3]]);
    });

    test('second call delivers correct dt since last processing', () => {
      // Call 1: lastUpdates → [2, 3, 4], clock at 5 after
      // Call 2: callStart=6; idx0: dt=6-2=4; idx1: dt=7-3=4; idx2: dt=8-4=4
      const dts: number[][] = [[], []];
      let callIdx = 0;
      const proc = createLimitedTimeProcess(3, (_, dt) => {
        dts[callIdx].push(dt);
      }, 999, true, makeClock());
      proc();
      callIdx = 1;
      proc();
      expect(dts[0]).toEqual([1, 2, 3]);
      expect(dts[1]).toEqual([4, 4, 4]);
    });
  });

  // ── Time budget ──────────────────────────────────────────────────────────

  describe('time budget', () => {
    test('stops after budget exhausted', () => {
      // limit=2: processes exactly 2 indices per call (each costs 1ms)
      const visited: number[] = [];
      const proc = createLimitedTimeProcess(4, (index) => visited.push(index), 2, true, makeClock());
      proc();
      expect(visited).toEqual([0, 1]);
    });

    test('resumes from last position on the next call', () => {
      const visited: number[] = [];
      const proc = createLimitedTimeProcess(4, (index) => visited.push(index), 2, true, makeClock());
      proc();
      proc();
      expect(visited).toEqual([0, 1, 2, 3]);
    });

    test('null timeLimitMs falls back to 8ms default', () => {
      // With limit=8 and 1ms/index cost: exactly 8 indices processed per call
      const visited: number[] = [];
      const proc = createLimitedTimeProcess(10, (index) => visited.push(index), null, true, makeClock());
      proc();
      expect(visited).toHaveLength(8);
    });

    test('processes at most length indices per call even with generous time budget', () => {
      const visited: number[] = [];
      const proc = createLimitedTimeProcess(3, (index) => visited.push(index), 999, true, makeClock());
      proc();
      expect(visited).toHaveLength(3);
    });
  });

  // ── repeat / cyclic ──────────────────────────────────────────────────────

  describe('repeat', () => {
    test('repeat=true wraps to index 0 and continues on next call', () => {
      const visited: number[] = [];
      const proc = createLimitedTimeProcess(3, (index) => visited.push(index), 999, true, makeClock());
      proc();
      proc();
      expect(visited).toEqual([0, 1, 2, 0, 1, 2]);
    });

    test('isFinished() is always false when repeat=true', () => {
      const proc = createLimitedTimeProcess(3, () => {}, 999, true, makeClock());
      proc();
      expect(proc.isFinished()).toBe(false);
    });

    test('repeat=false stops after one full pass', () => {
      const visited: number[] = [];
      const proc = createLimitedTimeProcess(3, (index) => visited.push(index), 999, false, makeClock());
      proc();
      expect(visited).toEqual([0, 1, 2]);
      expect(proc.isFinished()).toBe(true);
    });

    test('isFinished() is false before the pass completes', () => {
      const proc = createLimitedTimeProcess(3, () => {}, 1, false, makeClock()); // 1 index/call
      expect(proc.isFinished()).toBe(false);
      proc(); // processes index 0
      expect(proc.isFinished()).toBe(false);
    });

    test('repeat=null treated as false', () => {
      const proc = createLimitedTimeProcess(3, () => {}, 999, null, makeClock());
      proc();
      expect(proc.isFinished()).toBe(true);
    });
  });

  // ── pause / play ─────────────────────────────────────────────────────────

  describe('pause / play', () => {
    test('instance() does nothing while paused', () => {
      const visited: number[] = [];
      const proc = createLimitedTimeProcess(3, (index) => visited.push(index), 999, true, makeClock());
      proc.pause();
      proc();
      expect(visited).toEqual([]);
    });

    test('isPaused() reflects current state', () => {
      const proc = createLimitedTimeProcess(1, () => {}, 999, true, makeClock());
      expect(proc.isPaused()).toBe(false);
      proc.pause();
      expect(proc.isPaused()).toBe(true);
      proc.play();
      expect(proc.isPaused()).toBe(false);
    });

    test('play() before any pause() is a no-op', () => {
      const proc = createLimitedTimeProcess(1, () => {}, 999, true, makeClock());
      expect(() => proc.play()).not.toThrow();
      expect(proc.isPaused()).toBe(false);
    });

    test('dt excludes pause duration', () => {
      // Deterministic clock: each call returns a manually controlled value.
      const seq = [
        1,   // preStart → lastUpdates[0] = 1
        2,   // callStart of call 1
        3,   // t after processing idx 0 in call 1 (lastUpdates[0] = 2, t set to 3 but we break)
        4,   // pause(): pausedAt = 4
        104, // play(): pauseDuration = 104-4=100; lastUpdates[0] = 2+100 = 102
        105, // callStart of call 2
        106, // t after processing idx 0 in call 2 (unused in assertion)
      ];
      let i = 0;
      const clock = () => seq[i++];

      const dts: number[] = [];
      const proc = createLimitedTimeProcess(1, (_, dt) => dts.push(dt), 999, true, clock);

      proc(); // preStart=1, callStart=2; idx0: dt=2-1=1; lastUpdates[0]=2
      proc.pause();   // pausedAt = 4
      proc.play();    // pauseDuration = 104-4=100; lastUpdates[0] = 2+100 = 102
      proc();         // callStart=105; idx0: dt=105-102=3

      expect(dts[0]).toBe(1);
      expect(dts[1]).toBe(3); // not 103
    });

    test('play() before first instance() correctly initialises timestamps', () => {
      // pause()→1, preStart()→2, play-duration→3, then a gap, callStart→20
      // lastUpdates[0] = 2 + (3-1) = 4; dt = 20-4 = 16 → item is processed
      const seq = [1, 2, 3, 20, 21];
      let si = 0;
      const clock = () => seq[si++] ?? 21;

      const visited: number[] = [];
      const proc = createLimitedTimeProcess(1, (index) => visited.push(index), 999, true, clock);
      proc.pause();
      proc.play();
      proc();
      expect(visited).toEqual([0]);
    });
  });

  // ── dt = 0 guard ─────────────────────────────────────────────────────────

  describe('dt = 0 guard', () => {
    test('breaks loop when dt is 0, saves position for retry', () => {
      // preStart and callStart return the same timestamp → dt = 0
      const clock = (() => {
        const seq = [100, 100];
        let i = 0;
        return () => seq[i++] ?? 100;
      })();

      const visited: number[] = [];
      const proc = createLimitedTimeProcess(2, (index) => visited.push(index), 999, true, clock);
      proc();
      expect(visited).toEqual([]); // broke before processing anything
    });
  });
});
