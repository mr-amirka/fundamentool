/**
 * A log of records as tuples (fundamentool D-108): a JSON array a line, its first item the record's type, its fields
 * by place as the format's schema names them — a third of an object's size, the names kept once, in the schema. The
 * format has versions: a `["~", n]` line says the version of the lines after it, and each version's `up` moves a record
 * of the version before to it, so a file is only ever appended and every line is read as the newest version.
 */
import {
  array,
  custom,
  func,
  lazy,
  object,
  record,
  string,
} from '../schema';

const WHERE = '[fundamentool/tupleLog]';

/** The type of a version line. */
const VERSION = '~';

/** A record as the caller writes and reads it: its type and its fields by name. */
export type TTupleRecord = {
  /** Its type — a key of the version's `types`. */
  type: string;
  /** Its fields. */
  [field: string]: unknown;
};

/** One version of the format. */
export type TTupleVersion = {
  /** Each type's fields, in their places after the type. */
  types: Readonly<Record<string, readonly string[]>>;
  /**
   * Moves a record of the version before to this one; `null` — left out. Default: the fields this version names kept by
   * name, a new one `null`; a type it doesn't name left out.
   */
  up?: (record: TTupleRecord) => TTupleRecord | null;
};

/** `tupleLog`'s options. */
export type TTupleLogOptions = {
  /** The format's name, in its schema. */
  name: string;
  /** Its versions, the first version 1; the last is the one written. */
  versions: readonly TTupleVersion[];
};

/** A line that isn't a record of the format. */
export type TTupleProblem = {
  /** Its number, 1-based. */
  line: number;
  /** What is wrong. */
  message: string;
};

/** A text as read. */
export type TTupleRead = {
  /** The records, each as the newest version, with its line. */
  records: (TTupleRecord & { line: number })[];
  /** The lines that aren't records; the rest are kept. */
  problems: TTupleProblem[];
  /** The records a newer version left out. */
  dropped: number;
};

/** The schema as a file holds it, for a reader in any language. */
export type TTupleSchema = {
  /** Always `tuple-log`. */
  format: 'tuple-log';
  /** The format's name. */
  name: string;
  /** The newest version. */
  version: number;
  /** Each version's types and their fields, version 1 first. */
  versions: Readonly<Record<string, readonly string[]>>[];
};

/** A format of tuple logs. */
export type TTupleLog = {
  /** The format's name. */
  readonly name: string;
  /** The version written — the newest. */
  readonly version: number;
  /** The line a file starts with, and that is appended when the format moved on: `["~", version]`. */
  head(): string;
  /**
   * A record as a line of the newest version, no newline.
   *
   * @throws {TypeError} A type the version doesn't name, or a field left `undefined` (`null` is a value).
   */
  line(record: TTupleRecord): string;
  /** A text's records, every line moved to the newest version; lines before any `~` line are version 1. */
  read(text: string): TTupleRead;
  /** The schema, for its file. */
  schema(): TTupleSchema;
};

const OPTIONS = /*#__PURE__*/ lazy(() => object({
  name: string(),
  versions: custom<readonly TTupleVersion[]>((value) => Array.isArray(value) && value.length > 0, 'a list of versions, one at least'),
}));

const VERSION_SHAPE = /*#__PURE__*/ lazy(() => object({
  types: record(array(string())),
  up: func().optional(),
}));

/**
 * A format of tuple logs: write records as short lines, read them back by name, move the format on without rewriting a
 * file.
 *
 * @param options - `name`, `versions`.
 * @returns The format.
 * @throws {TypeError} In development, an unknown option ("did you mean"), no versions, a version's types not lists of
 * field names, the type `~`.
 * @example
 * const log = tupleLog({ name: 'chat', versions: [{ types: { m: ['at', 'text'] } }] });
 * log.head() + '\n' + log.line({ type: 'm', at: '2026-11-07T10:00:00Z', text: 'hi' });
 * // '["~",1]\n["m","2026-11-07T10:00:00Z","hi"]'
 * log.read('["~",1]\n["m","t","hi"]').records; // [{ type: 'm', at: 't', text: 'hi', line: 2 }]
 */
export function tupleLog(options: TTupleLogOptions): TTupleLog {
  if (process.env.NODE_ENV !== 'production') {
    OPTIONS().parse(options, `${WHERE} tupleLog`);
    options.versions.forEach((version, index) => {
      VERSION_SHAPE().parse(version, `${WHERE} tupleLog: versions[${index}]`);
      if (VERSION in version.types) {
        throw new TypeError(`${WHERE} tupleLog: versions[${index}]: the type "${VERSION}" is the version line's`);
      }
    });
  }
  const {
    name,
    versions,
  } = options;
  const newest = versions.length;
  const current = versions[newest - 1].types;

  /** A record of `from` moved to the newest version; `null` — left out on the way. */
  const lift = (start: TTupleRecord, from: number): TTupleRecord | null => {
    let value: TTupleRecord | null = start;
    for (let next = from; next < newest && value !== null; next++) {
      const {
        types, up,
      } = versions[next];
      if (up !== undefined) {
        value = up(value);
      } else {
        const fields = types[value.type];
        if (fields === undefined) {
          value = null;
        } else {
          const moved: TTupleRecord = {
            type: value.type,
          };
          for (const field of fields) {
            moved[field] = value[field] ?? null;
          }
          value = moved;
        }
      }
    }
    return value;
  };

  return {
    name,
    version: newest,
    head: () => JSON.stringify([
      VERSION,
      newest,
    ]),
    line(given) {
      const fields = current[given.type];
      if (fields === undefined) {
        throw new TypeError(`${WHERE} ${name}: no type "${given.type}" in version ${newest} (types: ${Object.keys(current).join(', ')})`);
      }
      const tuple: unknown[] = [given.type];
      for (const field of fields) {
        const value = given[field];
        if (value === undefined) {
          throw new TypeError(`${WHERE} ${name}: "${given.type}" without its field "${field}" — pass null for none`);
        }
        tuple.push(value);
      }
      return JSON.stringify(tuple);
    },
    read(text) {
      const read: TTupleRead = {
        records: [],
        problems: [],
        dropped: 0,
      };
      const lines = text.split('\n');
      const count = lines.length;
      let version = 1;
      for (let at = 0; at < count; at++) {
        const source = lines[at];
        if (source === '') {
          continue;
        }
        const number = at + 1;
        let tuple: unknown;
        try {
          tuple = JSON.parse(source);
        } catch {
          tuple = undefined;
        }
        if (!Array.isArray(tuple) || typeof tuple[0] !== 'string') {
          read.problems.push({
            line: number,
            message: 'not a tuple: a JSON array whose first item is its type',
          });
          continue;
        }
        const type = tuple[0];
        if (type === VERSION) {
          const next = tuple[1];
          if (tuple.length !== 2 || !Number.isInteger(next) || next < 1 || next > newest) {
            read.problems.push({
              line: number,
              message: `a version line of version 1 to ${newest} expected`,
            });
          } else {
            version = next;
          }
          continue;
        }
        const fields = versions[version - 1].types[type];
        const places = fields === undefined ? -1 : fields.length;
        if (places !== tuple.length - 1) {
          read.problems.push({
            line: number,
            message: places === -1 ?
              `no type "${type}" in version ${version}` :
              `"${type}" has ${places} fields in version ${version}, the line ${tuple.length - 1}`,
          });
          continue;
        }
        const decoded: TTupleRecord = {
          type,
        };
        for (let place = 0; place < places; place++) {
          decoded[fields[place]] = tuple[place + 1];
        }
        const lifted = version === newest ? decoded : lift(decoded, version);
        if (lifted === null) {
          read.dropped++;
        } else {
          read.records.push(Object.assign(lifted, {
            line: number,
          }));
        }
      }
      return read;
    },
    schema: () => ({
      format: 'tuple-log',
      name,
      version: newest,
      versions: versions.map((version) => version.types),
    }),
  };
}
