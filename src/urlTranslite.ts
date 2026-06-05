const SPACE = '-';
const TRANSLITE: Record<string, string> = {
  'а': 'a', 'б': 'b', 'в': 'v', 'г': 'g', 'д': 'd', 'е': 'e', 'ё': 'e',
  'ж': 'zh', 'з': 'z', 'и': 'i', 'й': 'j', 'к': 'k', 'л': 'l', 'м': 'm',
  'н': 'n', 'о': 'o', 'п': 'p', 'р': 'r', 'с': 's', 'т': 't', 'у': 'u',
  'ф': 'f', 'х': 'h', 'ц': 'c', 'ч': 'ch', 'ш': 'sh', 'щ': 'sh', 'ы': 'y',
  'э': 'e', 'ю': 'yu', 'я': 'ya',
};
const REGEXP_WORD = /[A-Za-z]/;
const REGEXP_SPACE = /\-+/g;
const REGEXP_TRIM = /^\-*|\-*$/g;

/**
 * Converts string to URL-friendly slug: lowercased, Cyrillic transliterated, non-word chars to dash, trimmed.
 *
 * @param input - The string to convert.
 * @param translite - Custom transliteration map (defaults to Cyrillic → Latin).
 * @returns URL-safe slug string.
 * @example
 * urlTranslite('Привет Мир'); // => 'privet-mir'
 * urlTranslite('Hello World!'); // => 'hello-world'
 */
export function urlTranslite(input: string, translite: Record<string, string> = TRANSLITE): string {
  const s = input.toLowerCase();
  const length = s.length;
  let output = '';
  for (let i = 0; i < length; i++) {
    const ch = s[i];
    output += REGEXP_WORD.test(ch) ? ch : (translite[ch] ?? SPACE);
  }
  return output.replace(REGEXP_SPACE, SPACE).replace(REGEXP_TRIM, '');
}
