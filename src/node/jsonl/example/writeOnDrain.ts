import { write } from '../write';

const writer = write(__dirname + '/output.jsonl');

writer.on('error', (error: any) => {
  console.error(error);
});

function finish() {
  console.log('Finish!');
  writer.end();
}
function onDrain() {
  let i = 20;
  let ok = true;
  let data;
  do {
    i--;
    data = {id: i, name: 'name' + i};
    if (i === 0) {
      writer.write(data, finish);
    } else {
      ok = writer.write(data);
    }
  } while (i > 0 && ok);
  if (i > 0) {
    writer.once('drain', onDrain);
  }
}
onDrain();

/*
function writeOneMillionTimes(writer, data, encoding, callback) {
  let i = 1000000;
  write();
  function write() {
    let ok = true;
    do {
      i--;
      if (i === 0) {
        // Last time!
        writer.write(data, encoding, callback);
      } else {
        // See if we should continue, or wait.
        // Don't pass the callback, because we're not done yet.
        ok = writer.write(data, encoding);
      }
    } while (i > 0 && ok);
    if (i > 0) {
      // Had to stop early!
      // Write some more once it drains.
      writer.once('drain', write);
    }
  }
}
*/