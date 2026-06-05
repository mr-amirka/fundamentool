import { extend } from '../extend';
import { getDataLink } from './getDataLink';
import { ready } from './ready';

export interface IDownload {
  (content: BlobPart | BlobPart[] | ArrayBuffer | string, type?: string, filename?: string): Promise<boolean>;
  base: (url: string, filename?: string) => Promise<boolean>;
}

declare const document: Document;

/**
 * Triggers a file download in the browser using a temporary `<a>` element.
 *
 * @param content - The content to download. Can be a string, `ArrayBuffer`, `BlobPart`, or an array of `BlobPart`.
 * @param type - Optional MIME type for the created blob.
 * @param filename - Optional filename for the downloaded file.
 * @returns A promise that resolves to `true` if the download was successful.
 * @example
 * await download('hello world', 'text/plain', 'hello.txt');
 */
export const download: IDownload = (
  content: BlobPart | BlobPart[] | ArrayBuffer | string,
  type?: string,
  filename?: string
): Promise<boolean> => base(getDataLink(content, type), filename);

const base = download.base = (url: string, filename?: string): Promise<boolean> => {
  return new Promise<boolean>((resolve) => {
    ready(() => {
      const link = extend(document.createElement('a'), {
        href: url,
        download: filename || String(+new Date()),
        target: '_blank',
        style: 'display:none;'
      } as any);
      const body = document.body;
      body.appendChild(link);
      link.click();
      body.removeChild(link);
      resolve(true);
    });
  });
};

