import { read } from '../promisify/read';

(async () => {
  const response = await read(__dirname + '/input.jsonl');

  console.log('response', response);

})().catch((err) => {
  console.error(err);
});