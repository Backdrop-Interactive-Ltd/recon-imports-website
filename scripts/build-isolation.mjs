import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

export function isolatedDistDir(task) {
  if (!['eid02b', 'eid03', 'data02'].includes(task)) throw Error('Unrecognized isolated build task.');
  return `.local/builds/${task}`;
}

// Next 16 also rewrites shared type metadata. Restore only recognized generated
// changes; never overwrite an unrelated edit made while a test build is running.
export function preserveTypeMetadata(root = process.cwd()) {
  const originals = ['tsconfig.json', 'next-env.d.ts'].map(name => {
    const filename = resolve(root, name);
    return { name, filename, content: existsSync(filename) ? readFileSync(filename, 'utf8') : null };
  });
  return () => {
    for (const original of originals) {
      if (original.content === null || !existsSync(original.filename)) continue;
      const current = readFileSync(original.filename, 'utf8');
      if (current === original.content) continue;
      let expected;
      if (original.name === 'tsconfig.json') {
        const normalize = text => {
          const value = JSON.parse(text);
          if (Array.isArray(value.include)) value.include = value.include.filter(item => !item.startsWith('.local/builds/'));
          return JSON.stringify(value);
        };
        expected = normalize(current) === normalize(original.content);
      } else {
        const normalize = text => text.replace(/import "\.\/(?:\.next(?:\/dev)?|\.local\/builds\/(?:eid02b|eid03|data02)(?:\/dev)?)\/types\/(?:routes|root-params)\.d\.ts";\r?\n/g, '');
        expected = normalize(current) === normalize(original.content);
      }
      if (expected) writeFileSync(original.filename, original.content);
      else console.warn(`Isolated build left an unexpected ${original.name} edit for review; it was not overwritten.`);
    }
  };
}
