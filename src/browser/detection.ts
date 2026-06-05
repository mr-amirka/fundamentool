import { joinSpace } from '../join/joinSpace';
import { addOf } from '../addOf';
import { toLower } from '../toLower';

const AGENTS: string[] = [
  'linux', 'mozilla', 'firefox', 'opera', 'trident', 'edge',
  'chrome', 'ubuntu', 'chromium', 'safari', 'msie', 'webkit', 'applewebkit',
  'mobile', 'ie', 'webtv', 'konqueror', 'blackberry', 'android', 'iron',
  'iphone', 'ipod', 'ipad', 'mac', 'darwin', 'windows', 'freebsd',
];

/**
 * Detects user agent tokens and versions from the given userAgent string.
 *
 * @param userAgent - Raw user agent string.
 * @param output - Optional array to append detection tokens into.
 * @returns Space-separated string of detected tokens.
 * @example
 * detection('Mozilla/5.0 ... Chrome/100'); // => 'chrome chrome-100'
 */
export function detection(userAgent: string, output?: string[]): string {
  const ua = toLower(userAgent || '');
  const out: string[] = output || [];

  AGENTS.forEach((userAgentName: string) => {
    const re = new RegExp(`(${userAgentName})([/ ]([0-9_x]+))?`, 'g');
    const match = re.exec(ua);
    if (match) {
      const name = match[1].replace(' ', '_');
      addOf(out, name);
      const version = match[3];
      if (version) {
        addOf(out, `${name}-${version}`);
      }
    }
  });

  return joinSpace(out);
}