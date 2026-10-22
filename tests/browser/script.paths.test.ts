/**
 * @jest-environment jsdom
 */
/**
 * `script` — a `<script>` added to the page's head: resolves when it loads (onload, or `readyState` complete/loaded in
 * old IE) and is removed; rejects when it fails (removed at once).
 */
import {
  script,
} from '../../src/browser/script';

/** The script element the call added. */
const added = () => document.head.querySelector('script:last-of-type') as HTMLScriptElement & { readyState?: string };

const tick = () => new Promise((resolve) => {
  setTimeout(resolve, 10);
});

describe('browser/script — every path', () => {
  it('loads: resolves, then the element is removed', async () => {
    const loading = script('http://localhost/a.js');
    const element = added();
    expect(element.src).toBe('http://localhost/a.js');
    element.onload?.(new Event('load'));
    await loading;
    await tick();
    expect(element.parentNode).toBeNull();
  });

  it('old IE: readyState complete or loaded resolves; anything else waits', async () => {
    const loading = script('http://localhost/b.js');
    const element = added();
    element.readyState = 'loading';
    (element as any).onreadystatechange();
    element.readyState = 'loaded';
    (element as any).onreadystatechange();
    await loading;
  });

  it('fails: rejects with the error, the element removed', async () => {
    const loading = script('http://localhost/c.js');
    const element = added();
    const failure = new Event('error');
    element.onerror?.(failure);
    await expect(loading).rejects.toBe(failure);
    expect(element.parentNode).toBeNull();
  });
});
