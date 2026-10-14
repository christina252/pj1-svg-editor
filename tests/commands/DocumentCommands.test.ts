import assert from 'node:assert/strict';
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { after, before, describe, it } from 'node:test';
import { runSession } from '../support/runSession.ts';

const TEMP_DIR = join('.tmp', 'document-commands');
const OTHER_SVG = join(TEMP_DIR, 'other.svg');

/** The external file of spec §6 (also kept in examples/other.svg). */
const OTHER_SVG_TEXT = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300" viewBox="0 0 400 300">
  <rect x="0" y="0" width="400" height="300" fill="#ffffff"/>
  <text id="t1" x="10" y="290">imported</text>
  <circle id="c1" cx="50" cy="50" r="10"/>
  <g id="g1">
    <rect id="r2" x="0" y="0" width="10" height="10"/>
    <circle id="c2" cx="5" cy="5" r="2"/>
  </g>
  <ellipse id="e1" cx="1" cy="2" rx="3" ry="4"/>
</svg>
`;

before(() => {
  mkdirSync(TEMP_DIR, { recursive: true });
  writeFileSync(OTHER_SVG, OTHER_SVG_TEXT, 'utf8');
});

after(() => {
  rmSync(TEMP_DIR, { recursive: true, force: true });
});

describe('init (spec §3, §6)', () => {
  it('creates the default 800x600 canvas', async () => {
    const sink = await runSession(['init']);
    assert.equal(sink.lines()[1], 'canvas 800x600 created');
  });

  it('takes width and height', async () => {
    const sink = await runSession(['init 400 200']);
    assert.equal(sink.lines()[1], 'canvas 400x200 created');
  });

  it('defaults the height when only the width is given', async () => {
    const sink = await runSession(['init 400']);
    assert.equal(sink.lines()[1], 'canvas 400x600 created');
  });

  it('rejects a non-numeric size', async () => {
    const sink = await runSession(['init wide']);
    assert.equal(sink.lines()[1], 'error: invalid number: wide');
  });

  it('rejects a non-positive size', async () => {
    const sink = await runSession(['init 0 600']);
    assert.equal(sink.lines()[1], 'error: canvas size must be positive');
  });

  it('rejects too many arguments', async () => {
    const sink = await runSession(['init 1 2 3']);
    assert.equal(sink.lines()[1], 'error: usage: init [w] [h]');
  });
});

describe('canvas (spec §3)', () => {
  it('reports the size without arguments', async () => {
    const sink = await runSession(['init 400 200', 'canvas']);
    assert.equal(sink.lines()[2], 'canvas 400x200');
  });

  it('resizes the canvas', async () => {
    const sink = await runSession(['init 400 200', 'canvas 800 600', 'canvas']);
    assert.equal(sink.lines()[2], 'canvas resized to 800x600');
    assert.equal(sink.lines()[3], 'canvas 800x600');
  });

  it('keeps the height when only the width is given', async () => {
    const sink = await runSession(['init 400 200', 'canvas 1000', 'canvas']);
    assert.equal(sink.lines()[3], 'canvas 1000x200');
  });

  it('requires a document (R-ERR11)', async () => {
    const sink = await runSession(['canvas']);
    assert.equal(sink.lines()[1], "error: no document. use 'init' or 'read' first");
  });
});

describe('read (spec §3, §6)', () => {
  it('prints the warning before the summary, as the specification transcript shows', async () => {
    const sink = await runSession([`read ${OTHER_SVG}`]);

    assert.deepEqual(sink.lines().slice(1), [
      'warning: assigned id rect1 to unnamed <rect>',
      `read ${OTHER_SVG} (7 elements)`,
    ]);
  });

  it('reports a file that does not exist (R-ERR10)', async () => {
    const sink = await runSession([`read ${join(TEMP_DIR, 'nope.svg')}`]);
    assert.match(sink.lines()[1] ?? '', /^error: cannot read file: /);
  });

  it('reports a file that is not SVG (R-ERR23)', async () => {
    const sink = await runSession([`read ${join('.', 'package.json')}`]);
    assert.match(sink.lines()[1] ?? '', /^error: invalid svg file: /);
  });

  it('requires exactly one path', async () => {
    const sink = await runSession(['read']);
    assert.equal(sink.lines()[1], 'error: usage: read <file.svg>');
  });
});

describe('save (spec §3, §6)', () => {
  it('writes the document, then remembers the path for a bare save', async () => {
    const target = join(TEMP_DIR, 'saved.svg');
    const sink = await runSession(['init 400 200', `save ${target}`, 'save']);

    assert.equal(sink.lines()[2], `saved to ${target} (0 elements)`);
    assert.equal(sink.lines()[3], `saved to ${target} (0 elements)`);
    assert.match(readFileSync(target, 'utf8'), /^<\?xml version="1\.0" encoding="UTF-8"\?>\n<svg xmlns=/);
  });

  it('round-trips a read file through save and read again', async () => {
    const target = join(TEMP_DIR, 'round-trip.svg');
    const sink = await runSession([`read ${OTHER_SVG}`, `save ${target}`, 'canvas', `read ${target}`, 'canvas']);

    // line 0 is the banner, line 1 the id warning of the first read
    assert.deepEqual(sink.lines().slice(1), [
      'warning: assigned id rect1 to unnamed <rect>',
      `read ${OTHER_SVG} (7 elements)`,
      `saved to ${target} (7 elements)`,
      'canvas 400x300',
      `read ${target} (7 elements)`,
      'canvas 400x300',
    ]);
  });

  it('refuses a bare save for a document that has no path yet (R-ERR12 / D5)', async () => {
    const sink = await runSession(['init', 'save']);
    assert.equal(sink.lines()[2], "error: no file path. use 'save <file.svg>'");
  });

  it('requires a document (R-ERR11)', async () => {
    const sink = await runSession(['save']);
    assert.equal(sink.lines()[1], "error: no document. use 'init' or 'read' first");
  });
});
