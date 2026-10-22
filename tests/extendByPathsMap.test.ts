import {
  extendByPathsMap,
} from '../src/extendByPathsMap';

describe('extendByPathsMap', () => {
  const src = {
    user: {
      name: 'Ann',
      age: 30,
    },
    lang: 'ru',
  };

  it('copies each `from` path to its `to` path; a missing one is skipped', () => {
    const dst = {
      kept: true,
    };
    expect(extendByPathsMap(
      dst, src, {
        name: 'user.name',
        'profile.language': 'lang',
        missing: 'user.email',
      },
    )).toBe(dst);
    expect(dst).toEqual({
      kept: true,
      name: 'Ann',
      profile: {
        language: 'ru',
      },
    });
  });

  it('`from` \'\' is the whole source; `to` \'\' extends the target itself with a plain object (a value is dropped)', () => {
    expect(extendByPathsMap(
      {}, src, {
        copy: '',
      },
    )).toEqual({
      copy: src,
    });
    expect(extendByPathsMap(
      {
        kept: true,
      }, src, {
        '': 'user',
      },
    )).toEqual({
      kept: true,
      name: 'Ann',
      age: 30,
    });
    expect(extendByPathsMap(
      {}, src, {
        '': 'lang',
      },
    )).toEqual({});
  });

  it('no map: the target as it is; a string map: the value at that path', () => {
    const dst = {};
    expect(extendByPathsMap(dst, src)).toBe(dst);
    expect(extendByPathsMap(
      dst, src, 'user.name' as never,
    )).toBe('Ann');
  });
});
