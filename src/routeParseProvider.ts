import { regexpMapperProvider } from './regexpMapperProvider';
import { scopeJoin } from './scopeJoin';
import { scopeSplit, ScopeNode } from './scopeSplit';

/**
 * Route patterns to RegExp + TRouteMapper converter.
 *
 * Поддерживаемый синтаксис:
 *
 * - Статические сегменты:
 *   - `'/path'`
 *
 * - Именованные параметры `:name`:
 *   - `'/user/:id'` → `keys = ['all', 'id']`, маппер заполняет `params.id`
 *   - `'/:lang/user/:id'` → `keys = ['all', 'lang', 'id']`
 *
 * - Регулярные группы в скобках:
 *   - `'/user/(profile|settings)'` → `keys = ['all', '0']` — значение группы доступно по числовому ключу
 *
 * - Переименование безымянной группы через `:name` сразу после скобок:
 *   - `'/user/(profile|settings):section'` → `keys = ['all', 'section']`,
 *     для `'/user/profile'` маппер заполняет `params.section = 'profile'`
 *
 * - Комбинированные шаблоны с регулярками и именованными параметрами:
 *   - `'/(ru|en):lang(/user/([0-9]+):id)?'`:
 *     - `keys = ['all', 'lang', '0', 'id']`
 *     - валидны пути `'/ru/user/123'`, `'/en/user/999'`
 *     - `params.lang` содержит `'ru'` / `'en'`, `params.id` — числовой id
 *
 * - Глубокие пути к свойствам (dotted‑path):
 *   - `'/user/:user.id'` → `params.user.id`
 *   - `'/:user.profile.id'` → `params.user.profile.id`
 *   - `'/(ru|en):lang/user/([0-9]+):user.profile.id'` → `params.lang`, `params.user.profile.id`
 *   - `'/user/([a-z_-]+):user.slug'` → `params.user.slug` (значение группы не ограничено цифрами)
 *
 * - Несколько опциональных частей маршрута:
 *   - `'/blog(/:year(/:month(/:day)?)?)?'`:
 *     - `'/blog'` → маппер матчит базовый маршрут
 *     - `'/blog/2024'` → `params.year = '2024'`
 *     - `'/blog/2024/03/16'` → `params.year`, `params.month`, `params.day`
 *
 * В итоговый RegExp всегда добавляется группа `all` с полным путём (`params.all`).
 */
const REGEXP_KEY = /:([_A-Za-z0-9.]+)/g;

/**
 * Parses a route and returns a RegExp and a list of keys.
 * 
 * @param route - The route to parse.
 * @param keys - The list of keys to populate.
 * @returns A RegExp and a list of keys.
 * @example
 * routeParseProviderBase('/user/:id', ['all', 'id']); // => /^(?:[^/]+)(?:/([^/]+))?$/
 * routeParseProviderBase('/user/:user.id', ['all', 'user.id']); // => /^(?:[^/]+)(?:/(?:[^/]+)(?:/(?:[^/]+))?)?$/
 * routeParseProviderBase('/user/:user.profile.id', ['all', 'user.profile.id']); // => /^(?:[^/]+)(?:/(?:[^/]+)(?:/(?:[^/]+))?)?$/
 */
export const routeParseProviderBase = (route: string, keys: string[]) => {
  const scope = scopeSplit(route, '(', ')');
  let index = 0;
  keys.push('all');
  base(scope);

  function base(scope: ScopeNode[]): void {
    const length = scope.length;
    let i = 0;
    let node: ScopeNode;
    let prevIsScope = false;

    function replaceKey(_: string, key: string, offset: number) {
      if (offset || !prevIsScope) {
        keys.push(key);
        return '([^/]+)';
      }
      index--;
      keys[keys.length - 1] = key;
      return '';
    }

    for (; i < length; i++) {
      node = scope[i];
      if (typeof node === 'string') {
        scope[i] = node.replace(REGEXP_KEY, replaceKey);
        prevIsScope = false;
      } else {
        keys.push(`${index}`);
        index++;
        base(node);
        prevIsScope = true;
      }
    }
  }

  return new RegExp(`^${scopeJoin(scope)}$`);
};

/**
 * Parses a route and returns a RegExp mapper.
 * 
 * @param route - The route to parse.
 * @returns A RegExp mapper.
 * @example
 * routeParseProvider('/user/:id'); // => /^(?:[^/]+)(?:/([^/]+))?$/
 * routeParseProvider('/user/:user.id'); // => /^(?:[^/]+)(?:/(?:[^/]+)(?:/(?:[^/]+))?)?$/
 * routeParseProvider('/user/:user.profile.id'); // => /^(?:[^/]+)(?:/(?:[^/]+)(?:/(?:[^/]+))?)?$/
 */
export const routeParseProvider = (route: string) => {
  const keys: any[] = [];
  return regexpMapperProvider(routeParseProviderBase(route, keys), keys);
};
