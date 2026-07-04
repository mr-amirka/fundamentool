export interface ILineDecoderBaseOptions {
  skipEmptyLines?: boolean;
}

export interface ILineDecoderOptions<T = any> extends ILineDecoderBaseOptions {
  parse?: (line: string) => T;
}

export interface ILineDecoderConstructor<T = any> {
  new (options?: ILineDecoderBaseOptions): BaseLineDecoder<T>;
}

export interface BaseLineDecoder<T = any> {
  write(chunk: string, output?: T[] | null): T[];
  end(chunk?: string, output?: T[] | null): T[];
}
