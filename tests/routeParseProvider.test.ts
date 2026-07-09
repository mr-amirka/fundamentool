import {
  routeParseProvider, routeParseProviderBase, 
} from '../src/routeParseProvider';

describe('routeParseProviderBase', () => {
  test('builds regex and keys for static route', () => {
    const keys: string[] = [];
    const re = routeParseProviderBase('/path', keys);

    expect(re).toBeInstanceOf(RegExp);
    expect(keys).toEqual(['all']);
    expect(re.test('/path')).toBe(true);
    expect(re.test('/other')).toBe(false);
  });

  test('collects key for single param /user/:id', () => {
    const keys: string[] = [];
    const re = routeParseProviderBase('/user/:id', keys);

    expect(re).toBeInstanceOf(RegExp);
    expect(keys).toEqual(['all', 'id']);
  });

  test('collects keys for regex params /(ru|en):lang/(user/([0-9]+):id)?', () => {
    const keys: string[] = [];
    const re = routeParseProviderBase('/(ru|en):lang/(user/([0-9]+):id)?', keys);

    expect(re).toBeInstanceOf(RegExp);
    expect(keys).toEqual([
      'all',
      'lang',
      '0',
      'id',
    ]);
  });

  test('collects keys for multiple params /:lang/user/:id', () => {
    const keys: string[] = [];
    routeParseProviderBase('/:lang/user/:id', keys);

    expect(keys).toEqual([
      'all',
      'lang',
      'id',
    ]);
  });

  test('renames unnamed group when followed by :name', () => {
    const keys: string[] = [];
    const re = routeParseProviderBase('/user/(profile|settings):section', keys);

    expect(re).toBeInstanceOf(RegExp);
    // безымянная группа переименована в section, числового индекса нет
    expect(keys).toEqual(['all', 'section']);
  });

  test('collects keys for regex group renamed to deep path ([a-z_-]+):user.slug', () => {
    const keys: string[] = [];
    const re = routeParseProviderBase('/user/([a-z_-]+):user.slug', keys);

    expect(re).toBeInstanceOf(RegExp);
    // безымянная группа переименована в user.slug
    expect(keys).toEqual(['all', 'user.slug']);
  });

  test('adds numeric key for unnamed group', () => {
    const keys: any[] = [];
    const re = routeParseProviderBase('/user/(profile|settings)', keys as string[]);

    expect(re).toBeInstanceOf(RegExp);
    // Первый элемент всегда "all", остальные описывают группы
    expect(keys[0]).toBe('all');
    // Для безымянной группы ожидаем числовой индекс, приведённый к строке
    const groupKeys = keys.slice(1).map(String);
    expect(groupKeys).toContain('0');
  });
});

describe('routeParseProvider (TRouteMapper)', () => {
  test('matches static path and returns true', () => {
    const match = routeParseProvider('/path');
    const params: Record<string, unknown> = {};

    expect(match('/path', params)).toBe(true);
    expect(params).toHaveProperty('all', '/path');
  });

  test('returns false for non-matching static path', () => {
    const match = routeParseProvider('/path');
    const params: Record<string, unknown> = {};

    expect(match('/other', params)).toBe(false);
    expect(Object.keys(params).length).toBe(0);
  });

  test('matches /user/:id and fills params', () => {
    const match = routeParseProvider('/user/:id');
    const params: Record<string, any> = {};

    expect(match('/user/42', params)).toBe(true);
    expect(params.all).toBe('/user/42');
    expect(params.id).toBe('42');
  });

  test('matches /user/:user.id and fills params', () => {
    const match = routeParseProvider('/user/:user.id');
    const params: Record<string, any> = {};

    expect(match('/user/42', params)).toBe(true);
    expect(params.all).toBe('/user/42');
    expect(params.user.id).toBe('42');
  });

  test('matches deep dotted params /:user.profile.id and fills nested object', () => {
    const match = routeParseProvider('/:user.profile.id');
    const params: Record<string, any> = {};

    expect(match('/123', params)).toBe(true);
    expect(params.all).toBe('/123');
    expect(params.user.profile.id).toBe('123');
  });

  test('matches /:lang/user/:id and fills params', () => {
    const match = routeParseProvider('/:lang/user/:id');
    const params: Record<string, any> = {};

    expect(match('/en/user/10', params)).toBe(true);
    expect(params.all).toBe('/en/user/10');
    expect(params.lang).toBe('en');
    expect(params.id).toBe('10');
  });

  test('regex-like route /(ru|en):lang(/user/([0-9]+):id)? matches valid language and numeric id', () => {
    const match = routeParseProvider('/(ru|en):lang(/user/([0-9]+):id)?');

    const paramsRu: Record<string, any> = {};
    const paramsEn: Record<string, any> = {};
    const paramsNoUser: Record<string, any> = {};
    const paramsWrongLang: Record<string, any> = {};
    const paramsWrongId: Record<string, any> = {};

    // валидные варианты
    expect(match('/ru/user/123', paramsRu)).toBe(true);
    expect(paramsRu.lang).toBe('ru');
    expect(paramsRu.id).toBe('123');

    expect(match('/en/user/999', paramsEn)).toBe(true);
    expect(paramsEn.lang).toBe('en');
    expect(paramsEn.id).toBe('999');

    // опциональная часть с user/ID может отсутствовать
    expect(match('/ru', paramsNoUser)).toBe(true);
    expect(paramsNoUser.lang).toBe('ru');
    expect(paramsNoUser.id).toBeUndefined();

    // неверный язык — не матчится
    expect(match('/de/user/1', paramsWrongLang)).toBe(false);
    expect(Object.keys(paramsWrongLang).length).toBe(0);

    // неверный id (не цифры) — не матчится
    expect(match('/ru/user/abc', paramsWrongId)).toBe(false);
    expect(Object.keys(paramsWrongId).length).toBe(0);
  });

  test('regex-like route with deep dotted param /(ru|en):lang/user/([0-9]+):user.profile.id', () => {
    const match = routeParseProvider('/(ru|en):lang/user/([0-9]+):user.profile.id');
    const params: Record<string, any> = {};

    expect(match('/ru/user/123', params)).toBe(true);
    expect(params.lang).toBe('ru');
    expect(params.user.profile.id).toBe('123');
  });

  test('regex-like route with non-numeric group /user/([a-z-]+):user.slug', () => {
    const match = routeParseProvider('/user/([a-z-]+):user.slug');
    const params: Record<string, any> = {};

    expect(match('/user/hello-world', params)).toBe(true);
    expect(params.user.slug).toBe('hello-world');
  });

  test('route with several optional parts /blog(/:year(/:month(/:day)?)?)?', () => {
    const match = routeParseProvider('/blog(/:year(/:month(/:day)?)?)?');

    const root: Record<string, any> = {};
    const y: Record<string, any> = {};
    const ym: Record<string, any> = {};
    const ymd: Record<string, any> = {};

    // базовый маршрут без параметров
    expect(match('/blog', root)).toBe(true);

    // /blog/2024
    expect(match('/blog/2024', y)).toBe(true);
    expect(y.year).toBe('2024');

    // /blog/2024/03
    expect(match('/blog/2024/03', ym)).toBe(true);
    expect(ym.year).toBe('2024');
    expect(ym.month).toBe('03');

    // /blog/2024/03/16
    expect(match('/blog/2024/03/16', ymd)).toBe(true);
    expect(ymd.year).toBe('2024');
    expect(ymd.month).toBe('03');
    expect(ymd.day).toBe('16');
  });

  test('route with unnamed group renamed by :section', () => {
    const match = routeParseProvider('/user/(profile|settings):section');
    const paramsProfile: Record<string, any> = {};
    const paramsSettings: Record<string, any> = {};

    expect(match('/user/profile', paramsProfile)).toBe(true);
    expect(match('/user/settings', paramsSettings)).toBe(true);

    expect(paramsProfile.section).toBe('profile');
    expect(paramsSettings.section).toBe('settings');
  });
  test('route with unnamed group: /user/(profile|settings)', () => {
    const match = routeParseProvider('/user/(profile|settings)');
    const paramsProfile: Record<string, any> = {};
    const paramsSettings: Record<string, any> = {};

    expect(match('/user/profile', paramsProfile)).toBe(true);
    expect(match('/user/settings', paramsSettings)).toBe(true);

    expect(paramsProfile.all).toBe('/user/profile');
    expect(paramsSettings.all).toBe('/user/settings');

    // Значение группы должно присутствовать в параметрах (под числовым ключом)
    const groupValueProfile = Object.values(paramsProfile).find((v) => v === 'profile');
    const groupValueSettings = Object.values(paramsSettings).find((v) => v === 'settings');
    expect(groupValueProfile).toBe('profile');
    expect(groupValueSettings).toBe('settings');
  });

  test('non-matching path returns false and does not fill params', () => {
    const match = routeParseProvider('/user/:id');
    const params: Record<string, any> = {};

    expect(match('/post/1', params)).toBe(false);
    expect(Object.keys(params).length).toBe(0);
  });

  test('non-matching path returns false and does not fill params', () => {
    const match = routeParseProvider('/user/:id');
    const params: Record<string, any> = {};

    expect(match('/post/1', params)).toBe(false);
    expect(Object.keys(params).length).toBe(0);
  });

  test('nested alternations with :name rename (minotation PATTERN_COLOR)', () => {
    // ^((camel):camel|(hex):color|(var):vv):value
    const match = routeParseProvider('^(([A-Z][a-z][A-Za-z]+):camel|([A-Fa-f0-9]+):color|(-?--[^;]+):vv):value');

    // Hex color → p.value + p.color
    const hex: Record<string, any> = {};
    expect(match('F00', hex)).toBe(true);
    expect(hex.value).toBe('F00');
    expect(hex.color).toBe('F00');
    expect(hex.camel).toBeUndefined();
    expect(hex.vv).toBeUndefined();

    // Named color → p.value + p.camel
    const named: Record<string, any> = {};
    expect(match('Red', named)).toBe(true);
    expect(named.value).toBe('Red');
    expect(named.camel).toBe('Red');
    expect(named.color).toBeUndefined();

    // CSS var → p.value + p.vv
    const cssVar: Record<string, any> = {};
    expect(match('--mycolor', cssVar)).toBe(true);
    expect(cssVar.value).toBe('--mycolor');
    expect(cssVar.vv).toBe('--mycolor');
    expect(cssVar.color).toBeUndefined();
  });
});

