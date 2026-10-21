import assert from 'node:assert/strict';
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { after, before, describe, it } from 'node:test';
import { runSession } from '../support/runSession.ts';

const TEMP_DIR = join('.tmp', 'edge-cases');

before(() => {
  mkdirSync(TEMP_DIR, { recursive: true });
});

after(() => {
  rmSync(TEMP_DIR, { recursive: true, force: true });
});

describe('edge cases — deep structure', () => {
  it('handles a 20-level nested container without losing anything', async () => {
    const lines = ['init', 'create g level0'];
    for (let depth = 1; depth < 20; depth += 1) {
      lines.push(`create g level${depth} in level${depth - 1}`);
    }
    lines.push('tree level0');

    const sink = await runSession(lines);
    const tree = sink.lines().slice(-20);

    assert.equal(tree[0], 'g#level0');
    assert.equal(tree.length, 20);
    assert.ok((tree.at(-1) ?? '').includes('g#level19'));
    assert.equal(sink.text().includes('error'), false);
  });

  it('scales a container recursively through many levels', async () => {
    const sink = await runSession([
      'init',
      'create g a',
      'create g b in a',
      'create g c in b',
      'create rect deep 10 10 20 20 in c',
      'scale a 2',
      'show deep',
    ]);

    assert.equal(sink.lines().at(-1), '  x=20 y=20 width=40 height=40');
  });
});

describe('edge cases — text content', () => {
  it('keeps markup characters and quotes through save and read', async () => {
    const target = join(TEMP_DIR, 'text.svg');
    const sink = await runSession([
      'init',
      'create text t1 10 20 "R&D <draft> #1"',
      `save ${target}`,
      `read ${target}`,
      'show t1',
    ]);

    assert.equal(sink.lines()[2], 'text#t1 created');
    assert.deepEqual(sink.lines().slice(5), [
      'text#t1  parent=svg',
      '  x=10 y=20',
      '  text="R&D <draft> #1"',
    ]);
  });

  it('keeps UTF-8 labels intact', async () => {
    const sink = await runSession(['init', 'create text t1 0 0 "处理数据 v2"', 'show t1']);

    assert.equal(sink.lines().at(-1), '  text="处理数据 v2"');
  });
});

describe('edge cases — documents', () => {
  it('round-trips an empty canvas', async () => {
    const target = join(TEMP_DIR, 'empty.svg');
    const sink = await runSession(['init 100 50', `save ${target}`, `read ${target}`, 'canvas', 'tree']);

    assert.deepEqual(sink.lines().slice(-2), ['canvas 100x50', 'svg (100x50)']);
  });

  it('reports a file that is not SVG at all (R-ERR23)', async () => {
    const broken = join(TEMP_DIR, 'broken.svg');
    writeFileSync(broken, 'this is not an svg document', 'utf8');

    const sink = await runSession([`read ${broken}`]);

    assert.match(sink.lines()[1] ?? '', /^error: invalid svg file: /);
  });

  it('keeps going after an unknown command', async () => {
    const sink = await runSession(['init', 'frobnicate', 'canvas']);

    assert.equal(sink.lines()[2], "error: unknown command: frobnicate. type 'help' for commands");
    assert.equal(sink.lines()[3], 'canvas 800x600');
  });
});

describe('edge cases — destructive commands', () => {
  it('restores a whole deleted subtree, in order', async () => {
    const sink = await runSession([
      'init',
      'create g g1',
      'create rect a 0 0 10 10 in g1',
      'create rect b 20 20 10 10 in g1',
      'create rect outer 0 0 5 5',
      'delete g1',
      'undo',
      'tree',
    ]);

    assert.deepEqual(sink.lines().slice(7), [
      'g#g1 restored into svg',
      'svg (800x600)',
      '├── g#g1',
      '│   ├── rect#a  x=0 y=0 w=10 h=10',
      '│   └── rect#b  x=20 y=20 w=10 h=10',
      '└── rect#outer  x=0 y=0 w=5 h=5',
    ]);
  });

  it('refuses to move a container into its own descendant (R-ERR18)', async () => {
    const sink = await runSession(['init', 'create g a', 'create g b in a', 'addto b a']);

    assert.equal(sink.lines().at(-1), 'error: cannot move a container into its own descendant: a');
  });

  it('refuses a zero or negative scale (R-ERR9)', async () => {
    const sink = await runSession(['init', 'create rect r1 0 0 10 10', 'scale r1 -1']);

    assert.equal(sink.lines().at(-1), 'error: scale factor must be positive');
  });
});
