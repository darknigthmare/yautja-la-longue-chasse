import {randomUUID} from 'node:crypto';
import {
  closeSync, existsSync, fstatSync, fsyncSync, linkSync, mkdirSync, openSync, readFileSync, readdirSync, unlinkSync, writeFileSync,
} from 'node:fs';
import {join, resolve} from 'node:path';

const maxRecords = 22001;

export function openClanPracticeJournalV127(directory) {
  const root = resolve(directory);
  mkdirSync(root, {recursive: true, mode: 0o700});
  const filename = index => String(index).padStart(5, '0') + '.json';
  const entries = readdirSync(root).filter(name => /^\d{5}\.json$/.test(name)).sort();
  if (entries.length > maxRecords || entries.some((name, index) => name !== filename(index))) {
    throw new Error('Journal du duel discontinu.');
  }
  const read = name => {
    const fd = openSync(join(root, name), 'r');
    try {
      const stat = fstatSync(fd);
      if (!stat.isFile() || stat.size > 4096) throw new Error('Entrée du journal du duel invalide.');
      return JSON.parse(readFileSync(fd, 'utf8'));
    } finally {
      closeSync(fd);
    }
  };
  const header = entries.length ? read(entries[0]) : undefined;
  let nextIndex = entries.length;

  return {
    header,
    *events() {
      for (const name of entries.slice(1)) yield read(name);
    },
    assertCurrent() {
      if (existsSync(join(root, filename(nextIndex)))) throw new Error('Le journal du duel a avancé.');
    },
    append(record) {
      if (nextIndex >= maxRecords) throw new Error('Journal du duel complet.');
      const body = JSON.stringify(record) + '\n';
      if (body.length > 4096) throw new Error('Entrée du journal du duel trop grande.');
      const temporary = join(root, '.pending-' + randomUUID());
      const fd = openSync(temporary, 'wx', 0o600);
      try {
        try {
          writeFileSync(fd, body);
          fsyncSync(fd);
        } finally {
          closeSync(fd);
        }
        // A hard link publishes the complete event and refuses to replace
        // an event already committed by another process at the same index.
        linkSync(temporary, join(root, filename(nextIndex)));
        const dir = openSync(root, 'r');
        try {
          fsyncSync(dir);
        } finally {
          closeSync(dir);
        }
        nextIndex++;
      } finally {
        unlinkSync(temporary);
      }
    },
  };
}
