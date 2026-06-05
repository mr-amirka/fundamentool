import { readUnopenedLimited } from '../readUnopenedLimited';

const read = readUnopenedLimited(__dirname + '/input.jsonl', {
  bufferLength: 1024 * 8,
});

(async () => {
  const response = await read();
  console.log({
    response,
  });
})().catch((err) => {
  console.error(err);
});
