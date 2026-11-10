import {
  splitSentences,
} from '../src/splitSentences';

describe('splitSentences', () => {
  it.each([
    [
      'One tool. Code and documents!\n\nA list:',
      [
        'One tool.',
        'Code and documents!',
        'A list:',
      ],
    ],
    [
      'Is it? Yes… it is.',
      [
        'Is it?',
        'Yes…',
        'it is.',
      ],
    ],
    [
      'v1.2 is out',
      ['v1.2 is out'],
    ],
    [
      'a line\nand the next',
      ['a line\nand the next'],
    ],
    [
      '  \n\n ',
      [],
    ],
    [
      '',
      [],
    ],
    [
      'Это так. Да.',
      [
        'Это так.',
        'Да.',
      ],
    ],
  ])('%j → %j', (text, sentences) => {
    expect(splitSentences(text)).toEqual(sentences);
  });
});
