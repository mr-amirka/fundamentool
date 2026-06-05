import { intervalAsync } from '../../../async/intervalAsync';
import { createTimeout } from '../../../createTimeout';
import { write } from '../write';

const writer = write(__dirname + '/output.jsonl');

let i = 0;
const cancel = intervalAsync(() => {
  i++;
  writer.write(JSON.stringify({id: i, name: 'name' + i}));
}, 100);

const cancelEnd = createTimeout(() => {
  cancel();
  writer.end();
}, 1200);

writer.on('error', (error: any) => {
  cancel();
  cancelEnd();
  console.error(error);
});
