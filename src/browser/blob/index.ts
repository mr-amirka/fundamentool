import { provider } from './provider';

export { provider } from './provider';
export { from } from './from';


export const toText = provider<string>('readAsText');
export const toBase64Url = provider<string>('readAsDataURL');
export const toArrayBuffer = provider<ArrayBuffer>('readAsArrayBuffer');
