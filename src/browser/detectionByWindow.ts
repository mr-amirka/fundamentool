import {
  addOf, 
} from '../addOf';
import {
  isDefined, 
} from '../is/isDefined';
import {
  detection, 
} from './detection';

interface IWindowLike {
  orientation?: any;
  navigator?: {
    maxTouchPoints?: number;
    userAgent?: string;
    [key: string]: any;
  };
  [key: string]: any;
}

/**
 * Detects environment flags based on `window` object and userAgent.
 *
 * @param windowObj - Window-like object.
 * @param output - Optional array to append detection tokens into.
 * @returns Space-separated string of detected tokens.
 * @example
 * detectionByWindow(window); // => 'chrome chrome-100 multitouch'
 */
export function detectionByWindow(windowObj: IWindowLike, output?: string[]): string {
  const out: string[] = output || [];

  if (isDefined(windowObj.orientation)) {
    addOf(out, 'orientation');
  }

  const nav: any = windowObj.navigator || {};
  const maxTouchPoints = nav.maxTouchPoints;
  if (typeof maxTouchPoints === 'number' && maxTouchPoints > 1) {
    addOf(out, 'multitouch');
  }

  return detection(nav.userAgent || '', out);
}
