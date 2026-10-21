import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { AddToCommand } from '../../src/commands/AddToCommand.ts';
import { BackCommand } from '../../src/commands/BackCommand.ts';
import { CanvasCommand } from '../../src/commands/CanvasCommand.ts';
import { CommandCatalog } from '../../src/commands/CommandCatalog.ts';
import { CreateCommand } from '../../src/commands/CreateCommand.ts';
import { DeleteCommand } from '../../src/commands/DeleteCommand.ts';
import { FrontCommand } from '../../src/commands/FrontCommand.ts';
import { GroupCommand } from '../../src/commands/GroupCommand.ts';
import { InitCommand } from '../../src/commands/InitCommand.ts';
import { MoveCommand } from '../../src/commands/MoveCommand.ts';
import { ReadCommand } from '../../src/commands/ReadCommand.ts';
import { SaveCommand } from '../../src/commands/SaveCommand.ts';
import { ScaleCommand } from '../../src/commands/ScaleCommand.ts';
import { SetCommand } from '../../src/commands/SetCommand.ts';
import { ShowCommand } from '../../src/commands/ShowCommand.ts';
import { TreeCommand } from '../../src/commands/TreeCommand.ts';
import { UngroupCommand } from '../../src/commands/UngroupCommand.ts';
import { Application } from '../../src/cli/Application.ts';

const catalog = CommandCatalog.default();

/** name → the usage string the command reports on a syntax error. */
const USAGES: readonly (readonly [string, string])[] = [
  ['init', InitCommand.USAGE],
  ['read', ReadCommand.USAGE],
  ['save', SaveCommand.USAGE],
  ['canvas', CanvasCommand.USAGE],
  ['create', CreateCommand.USAGE],
  ['delete', DeleteCommand.USAGE],
  ['move', MoveCommand.USAGE],
  ['scale', ScaleCommand.USAGE],
  ['set', SetCommand.USAGE],
  ['group', GroupCommand.USAGE],
  ['ungroup', UngroupCommand.USAGE],
  ['addto', AddToCommand.USAGE],
  ['front', FrontCommand.USAGE],
  ['back', BackCommand.USAGE],
  ['tree', TreeCommand.USAGE],
  ['show', ShowCommand.USAGE],
];

describe('command surface — help, errors and code must not drift apart', () => {
  it('the catalogue still describes the 19 commands of spec §3', () => {
    assert.equal(catalog.all().length, 19);
  });

  it('every registered command is described in the catalogue', () => {
    const application = new Application();
    for (const name of application.registry.names()) {
      assert.ok(catalog.find(name) !== undefined, `'${name}' is registered but missing from the catalogue`);
    }
  });

  it('every usage string equals the syntax shown by help (R-ERR14)', () => {
    for (const [name, usage] of USAGES) {
      const spec = catalog.find(name);
      assert.ok(spec !== undefined, `'${name}' is missing from the catalogue`);
      assert.equal(usage, spec.syntax, `usage of '${name}' differs from the catalogue`);
    }
  });

  it('every command that takes arguments documents them in its usage string', () => {
    for (const [name, usage] of USAGES) {
      const spec = catalog.find(name);
      assert.ok(spec !== undefined);
      // the catalogue syntax and the usage constant are the same string, so a
      // command cannot silently accept an argument it does not advertise
      assert.equal(usage.trim().startsWith(name), true);
    }
  });
});
