import { openLink } from '../../src/browser/openLink';
import { setupBrowserDomMocks } from './browserDomMocks';

describe('browser/openLink', () => {
  let clickMock: jest.Mock;

  beforeEach(() => {
    ({ clickMock } = setupBrowserDomMocks());
  });

  test('creates anchor and clicks it', async () => {
    await openLink('https://example.com');

    expect((global as any).document.createElement).toHaveBeenCalledWith('a');
    expect(clickMock).toHaveBeenCalledTimes(1);
  });
});
