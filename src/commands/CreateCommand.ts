import { EditorError } from '../errors/EditorError.ts';
import { CommandEdit } from '../history/CommandEdit.ts';
import type { Container } from '../model/Container.ts';
import type { Document } from '../model/Document.ts';
import type { Element } from '../model/Element.ts';
import { ShapeFactory } from '../factory/ShapeFactory.ts';
import type { Command } from './Command.ts';
import type { CommandContext } from './CommandContext.ts';

/**
 * `create <type> <id> [params…] [in <containerId>]` — spec §3 / §4.1.
 *
 * The `in` clause is what makes hierarchy explicit *at creation time*; `group`
 * and `addto` still exist for "collect existing shapes" and "change the owner of
 * an existing shape" (spec §4.1).
 *
 * Nothing is mutated until the element has been built and its parent resolved,
 * so a failing command leaves the document untouched (R-C7).
 */
export class CreateCommand implements Command {
  readonly name: string = 'create';
  static readonly USAGE = 'create <type> <id> [params] [in <containerId>]';

  readonly #factory: ShapeFactory;

  constructor(factory: ShapeFactory = new ShapeFactory()) {
    this.#factory = factory;
  }

  execute(args: readonly string[], context: CommandContext): void {
    const { type, id, params, containerId } = CreateCommand.#split(args);
    const document = context.session.requireDocument();

    if (document.hasId(id)) {
      throw EditorError.idAlreadyExists(id);
    }

    const element = this.#factory.create(type, id, params);
    const parent = containerId === null ? document : CreateCommand.#containerOf(document, containerId);
    parent.append(element);

    const forward =
      containerId === null
        ? `${element.label()} created`
        : `${element.label()} created in ${parent.label()}`;
    context.out.line(forward);
    context.session.history.push(
      new CommandEdit(
        () => {
          parent.removeChild(element);
          return `${element.label()} removed`;
        },
        () => {
          parent.append(element);
          return forward;
        },
      ),
    );
  }

  /** Splits `<type> <id> [params…] [in <containerId>]`. */
  static #split(args: readonly string[]): {
    type: string;
    id: string;
    params: string[];
    containerId: string | null;
  } {
    if (args.length < 2) {
      throw EditorError.usage(CreateCommand.USAGE);
    }
    const type = args[0] ?? '';
    const id = args[1] ?? '';
    const params = args.slice(2);

    let containerId: string | null = null;
    const inIndex = params.length - 2;
    if (inIndex >= 0 && params[inIndex] === 'in') {
      containerId = params[inIndex + 1] ?? null;
      params.splice(inIndex, 2);
    }

    return { type, id, params, containerId };
  }

  static #containerOf(document: Document, id: string): Container {
    const target: Element | undefined = document.find(id);
    if (target === undefined) {
      throw EditorError.noSuchContainer(id);
    }
    if (!target.isContainer) {
      throw EditorError.notAContainer(id);
    }
    return target as Container;
  }
}
