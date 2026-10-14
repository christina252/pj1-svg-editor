import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { runSession } from '../support/runSession.ts';

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
