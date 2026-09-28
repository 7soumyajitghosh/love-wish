// Tiny synchronous JSON file store (no native deps, no database server).
import fs from 'node:fs';
import path from 'node:path';

export function createStore(file, initial) {
  const dir = path.dirname(file);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  if (!fs.existsSync(file)) {
    fs.writeFileSync(file, JSON.stringify(initial, null, 2));
  }
  return {
    file,
    read() {
      try {
        return JSON.parse(fs.readFileSync(file, 'utf8'));
      } catch {
        return initial;
      }
    },
    write(data) {
      const tmp = file + '.tmp';
      fs.writeFileSync(tmp, JSON.stringify(data, null, 2));
      fs.renameSync(tmp, file);
    },
  };
}
