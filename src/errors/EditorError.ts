/**
 * The user-facing error type of the whole application.
 *
 * It lives in its own module on purpose: the model and the command layer must
 * be able to report failures the specification defines (`error: no such shape: r9`)
 * without importing the CLI (see doc/README.md — 依赖方向规则).
 *
 * The factories below are the single place where the error catalogue of
 * spec §4.2 (+ the additions recorded in docs/plan.md) is written down.
 */
export class EditorError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'EditorError';
  }

  /** R-ERR1 */ static idAlreadyExists(id: string): EditorError {
    return new EditorError(`id already exists: ${id}`);
  }
  /** R-ERR2 */ static noSuchShape(id: string): EditorError {
    return new EditorError(`no such shape: ${id}`);
  }
  /** R-ERR3 */ static noSuchContainer(id: string): EditorError {
    return new EditorError(`no such container: ${id}`);
  }
  /** R-ERR4 */ static notAContainer(id: string): EditorError {
    return new EditorError(`not a container: ${id}`);
  }
  /** R-ERR5 */ static unknownShapeType(type: string): EditorError {
    return new EditorError(`unknown shape type: ${type} (is the plugin loaded?)`);
  }
  /** R-ERR6 */ static cannotUngroupComposite(id: string): EditorError {
    return new EditorError(`cannot ungroup composite shape: ${id}`);
  }
  /** R-ERR7 */ static cannotGroupIntoDescendant(id: string): EditorError {
    return new EditorError(`cannot group a container into its own descendant: ${id}`);
  }
  /** R-ERR8 */ static cannotUngroupTopLevel(id: string): EditorError {
    return new EditorError(`cannot ungroup top-level container: ${id}`);
  }
  /** R-ERR9 */ static scaleFactorMustBePositive(): EditorError {
    return new EditorError('scale factor must be positive');
  }
  /** R-ERR10 */ static cannotReadFile(path: string): EditorError {
    return new EditorError(`cannot read file: ${path}`);
  }
  /** R-ERR10 */ static cannotWriteFile(path: string): EditorError {
    return new EditorError(`cannot write file: ${path}`);
  }
  /** R-ERR11 */ static noDocument(): EditorError {
    return new EditorError("no document. use 'init' or 'read' first");
  }
  /** R-ERR12 */ static noFilePath(): EditorError {
    return new EditorError("no file path. use 'save <file.svg>'");
  }
  /** R-ERR13 */ static unknownAttribute(name: string): EditorError {
    return new EditorError(`unknown attribute: ${name}`);
  }
  /** R-ERR14 */ static usage(syntax: string): EditorError {
    return new EditorError(`usage: ${syntax}`);
  }
  /** R-ERR15 */ static unterminatedQuote(): EditorError {
    return new EditorError('unterminated quote in command line');
  }
  /** R-ERR16 */ static unknownCommand(name: string): EditorError {
    return new EditorError(`unknown command: ${name}. type 'help' for commands`);
  }
  /** R-ERR17 */ static invalidNumber(text: string): EditorError {
    return new EditorError(`invalid number: ${text}`);
  }
  /** R-ERR18 */ static cannotMoveIntoDescendant(id: string): EditorError {
    return new EditorError(`cannot move a container into its own descendant: ${id}`);
  }
  /** R-ERR21 (D12) — geometry commands on a preserved foreign element */
  static unsupportedElement(id: string): EditorError {
    return new EditorError(`unsupported element: ${id}`);
  }
  /** R-ERR22 (D18) — init/canvas with a non-positive size */
  static canvasSizeMustBePositive(): EditorError {
    return new EditorError('canvas size must be positive');
  }
  /** D16 */ static nothingToUndo(): EditorError {
    return new EditorError('nothing to undo');
  }
  /** D16 */ static nothingToRedo(): EditorError {
    return new EditorError('nothing to redo');
  }
  /** R-U3 */ static undoNotAllowedAfterIo(): EditorError {
    return new EditorError('undo not allowed after io command');
  }
  /** R-U3 */ static redoNotAllowedAfterIo(): EditorError {
    return new EditorError('redo not allowed after io command');
  }
}
