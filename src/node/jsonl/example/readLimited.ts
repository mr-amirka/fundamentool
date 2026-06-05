import { readLimited } from '../readLimited';

const _read = readLimited(__dirname + '/input.jsonl', {
  bufferLength: 1024 * 8,
  limit: 100,
});

function next(items: any[]) {
  console.log({
    items,
  });
  items.length && read();
}
function read() {
  _read().then(next, onError);
}
function onError(error: any) {
  console.error(error);
}

read();
