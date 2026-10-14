import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { CliError } from '../../src/cli/CliError.ts';
import { Tokenizer } from '../../src/cli/Tokenizer.ts';

describe('Tokenizer', () => {
  it('splits a command line on blanks', () => {
    assert.deepEqual(Tokenizer.tokenize('move c1 30 0'), ['move', 'c1', '30', '0']);
  });

  it('keeps a quoted argument together and strips the quotes', () => {
    assert.deepEqual(Tokenizer.tokenize('create text title 20 40 "My Diagram"'), [
      'create',
      'text',
      'title',
      '20',
      '40',
      'My Diagram',
    ]);
  });

  it('keeps UTF-8 text content (spec §6.1 uses Chinese labels)', () => {
    assert.deepEqual(Tokenizer.tokenize('create text t1 155 135 "处理数据"'), [
      'create',
      'text',
      't1',
      '155',
      '135',
      '处理数据',
    ]);
  });

  it('treats a leading # as a comment line', () => {
    assert.deepEqual(Tokenizer.tokenize('# create rect bg 0 0 800 600'), []);
    assert.deepEqual(Tokenizer.tokenize('   # indented comment'), []);
  });

  it('does NOT treat an inline # as a comment (fill colours)', () => {
    assert.deepEqual(Tokenizer.tokenize('create rect bg 0 0 800 600 #ffffff'), [
      'create',
      'rect',
      'bg',
      '0',
      '0',
      '800',
      '600',
      '#ffffff',
    ]);
  });

  it('ignores repeated blanks and tabs', () => {
    assert.deepEqual(Tokenizer.tokenize('  move\t\tc1   30 0  '), ['move', 'c1', '30', '0']);
  });

  it('ignores blank lines', () => {
    assert.deepEqual(Tokenizer.tokenize(''), []);
    assert.deepEqual(Tokenizer.tokenize('   \t '), []);
  });

  it('supports an empty quoted argument', () => {
    assert.deepEqual(Tokenizer.tokenize('set t1 text ""'), ['set', 't1', 'text', '']);
  });

  it('reports an unterminated quote (D10 / R-ERR15)', () => {
    assert.throws(() => Tokenizer.tokenize('create text t1 20 40 "broken'), CliError);
    assert.throws(
      () => Tokenizer.tokenize('create text t1 20 40 "broken'),
      /unterminated quote in command line/,
    );
  });
});
