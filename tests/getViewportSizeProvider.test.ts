import {
  getViewportSizeProvider, 
} from '../src/getViewportSizeProvider';

describe('getViewportSizeProvider', () => {
  test('returns innerWidth/innerHeight when available', () => {
    const win: any = {
      innerWidth: 1280,
      innerHeight: 720,
      document: {
        documentElement: {
          clientWidth: 800,
          clientHeight: 600, 
        }, 
      },
    };
    expect(getViewportSizeProvider(win)()).toEqual([1280, 720]);
  });

  test('falls back to documentElement.clientWidth/clientHeight', () => {
    const win: any = {
      document: {
        documentElement: {
          clientWidth: 800,
          clientHeight: 600, 
        }, 
      },
    };
    expect(getViewportSizeProvider(win)()).toEqual([800, 600]);
  });

  test('returns fresh values on each call', () => {
    const win: any = {
      innerWidth: 1024,
      innerHeight: 768,
      document: {
        documentElement: {
          clientWidth: 0,
          clientHeight: 0, 
        }, 
      },
    };
    const getSize = getViewportSizeProvider(win);
    expect(getSize()).toEqual([1024, 768]);
    win.innerWidth = 1920;
    win.innerHeight = 1080;
    expect(getSize()).toEqual([1920, 1080]);
  });
});
