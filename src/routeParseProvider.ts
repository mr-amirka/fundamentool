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
 *
 * - Несколько опциональных частей маршрута:
 *   - `'/blog(/:year(/:month(/:day)?)?)?'`:
 *     - `'/blog'` → маппер матчит базовый маршрут
 *     - `'/blog/2024'` → `params.year = '2024'`
 *
 * - Вложенные альтернации с переименованием (напр. PATTERN_COLOR в minotation):
 *   - `'^(([A-Z][a-z]+):camel|([A-Fa-f0-9]+):color|(--[^;]+):vv):value'`
 *   - `'F00'` → `{ all:'F00', value:'F00', color:'F00' }`
 *
 * В итоговый RegExp всегда добавляется группа `all` с полным путём (`params.all`).
 */
const REGEXP_KEY = /:([_A-Za-z0-9.]+)/g;

/**
 * Parses a route and returns a RegExp and a list of keys.
 *
 * Алгоритм: scopeSplit разбивает паттерн на дерево скоупов по `(`/`)`.
 * Для каждого скоупа сохраняется индекс его ключа в общем массиве keys,
 * чтобы `:name` после скоупа мог переименовать правильный ключ.
 *
 * @param route - The route to parse.
 * @param keys - The list of keys to populate.
 * @returns A RegExp and a list of keys.
 */
export const routeParseProviderBase = (route: string, keys: string[]): RegExp => {
  const scope = scopeSplit(route, '(', ')');
  keys.push('all');
  base(scope);

  // Переназначаем числовые ключи для безымянных скоупов:
  // те, что остались с плейсхолдером '' — получают индексы 0, 1, 2...
  let nextIndex = 0;
  for (let i = 0; i < keys.length; i++) {
    if (keys[i] === '') {
      keys[i] = `${nextIndex++}`;
    }
  }

  function base(nodes: ScopeNode[]): void {
    const length = nodes.length;
    let i = 0;
    let node: ScopeNode;
    let prevIsScope = false;
    let lastScopeKeyIndex = -1;

    for (; i < length; i++) {
      node = nodes[i];
      if (typeof node === 'string') {
        nodes[i] = node.replace(REGEXP_KEY, (
          _: string,
          key: string,
          offset: number,
        ): string => {
          if (offset || !prevIsScope) {
            keys.push(key);
            return '([^/]+)';
          }
          // :name сразу после скоупа — переименовываем ключ этого скоупа
          keys[lastScopeKeyIndex] = key;
          return '';
        });
        prevIsScope = false;
      } else {
        lastScopeKeyIndex = keys.length;
        keys.push(''); // плейсхолдер — заменится на индекс или :name
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
 */
export const routeParseProvider = (route: string) => {
  const keys: string[] = [];
  return regexpMapperProvider(routeParseProviderBase(route, keys), keys);
};


