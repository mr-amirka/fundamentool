export interface ILineBasedFormatOptions {
  parse: (input: string) => any;
  stringify: (input: any) => string;
}
