import type { CommandGroup, CommandSpec } from './CommandSpec.ts';

/** A group of command specs, in catalogue order. */
export interface CommandGroupEntry {
  readonly group: CommandGroup;
  readonly specs: readonly CommandSpec[];
}

const GROUP_ORDER: readonly CommandGroup[] = ['document', 'edit', 'view', 'history'];

/**
 * The command reference: all 19 commands of PJ1 Phase 1 (spec §3).
 *
 * Data only — it deliberately holds no behaviour, so `help` can describe a
 * command before (or after) its implementation is registered.
 */
export class CommandCatalog {
  readonly #specs: readonly CommandSpec[];

  constructor(specs: readonly CommandSpec[]) {
    this.#specs = specs;
  }

  static default(): CommandCatalog {
    return new CommandCatalog([
      {
        name: 'init',
        syntax: 'init [w] [h]',
        summary: 'new empty canvas (default 800x600) as the current document',
        group: 'document',
        undoable: false,
      },
      {
        name: 'read',
        syntax: 'read <file.svg>',
        summary: 'read an SVG file as the current document',
        group: 'document',
        undoable: false,
      },
      {
        name: 'save',
        syntax: 'save [file.svg]',
        summary: 'save the current document (default: the path it was read from)',
        group: 'document',
        undoable: false,
      },
      {
        name: 'canvas',
        syntax: 'canvas [w] [h]',
        summary: 'show the canvas size, or resize it',
        group: 'document',
        undoable: false,
      },
      {
        name: 'create',
        syntax: 'create <type> <id> [params] [in <containerId>]',
        summary: 'create a shape: rect, circle, ellipse, line, text, g',
        group: 'edit',
        undoable: true,
      },
      {
        name: 'delete',
        syntax: 'delete <id>',
        summary: 'delete a shape (a container takes its whole subtree with it)',
        group: 'edit',
        undoable: true,
      },
      {
        name: 'move',
        syntax: 'move <id> <dx> <dy>',
        summary: 'translate by an offset; a container moves as a whole',
        group: 'edit',
        undoable: true,
      },
      {
        name: 'scale',
        syntax: 'scale <id> <factor>',
        summary: 'scale every geometric attribute by a positive factor',
        group: 'edit',
        undoable: true,
      },
      {
        name: 'set',
        syntax: 'set <id> <attr> <value>',
        summary: 'set a whitelisted attribute (fill, stroke, stroke-width, geometry, text)',
        group: 'edit',
        undoable: true,
      },
      {
        name: 'group',
        syntax: 'group <newGid> <id1> <id2> ...',
        summary: 'create a container holding the given shapes, keeping their order',
        group: 'edit',
        undoable: true,
      },
      {
        name: 'ungroup',
        syntax: 'ungroup <gid>',
        summary: 'dissolve a container, promoting its children to its own place',
        group: 'edit',
        undoable: true,
      },
      {
        name: 'addto',
        syntax: 'addto <gid> <id>',
        summary: 'move an existing shape into a container (as the last child)',
        group: 'edit',
        undoable: true,
      },
      {
        name: 'front',
        syntax: 'front <id>',
        summary: 'move a shape to the front among its siblings',
        group: 'edit',
        undoable: true,
      },
      {
        name: 'back',
        syntax: 'back <id>',
        summary: 'move a shape to the back among its siblings',
        group: 'edit',
        undoable: true,
      },
      {
        name: 'tree',
        syntax: 'tree [id]',
        summary: 'print the document tree, or the subtree rooted at <id>',
        group: 'view',
        undoable: false,
      },
      {
        name: 'show',
        syntax: 'show <id>',
        summary: "print one shape's attributes",
        group: 'view',
        undoable: false,
      },
      {
        name: 'help',
        syntax: 'help',
        summary: 'show all commands and their syntax',
        group: 'view',
        undoable: false,
      },
      {
        name: 'undo',
        syntax: 'undo',
        summary: 'undo the last edit command',
        group: 'history',
        undoable: false,
      },
      {
        name: 'redo',
        syntax: 'redo',
        summary: 'redo the last undone edit command',
        group: 'history',
        undoable: false,
      },
    ]);
  }

  all(): readonly CommandSpec[] {
    return this.#specs;
  }

  find(name: string): CommandSpec | undefined {
    return this.#specs.find((spec) => spec.name === name);
  }

  grouped(): readonly CommandGroupEntry[] {
    return GROUP_ORDER.map((group) => ({
      group,
      specs: this.#specs.filter((spec) => spec.group === group),
    }));
  }
}
