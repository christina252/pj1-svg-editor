import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join, relative, resolve, sep } from 'node:path';

/** Which modules a module is allowed to import. */
export interface DependencyRule {
  readonly module: string;
  readonly allowed: readonly string[];
}

/** One relative import found in a source file. */
export interface SourceImport {
  readonly specifier: string;
  /** First directory under `src/`, or null when the import leaves `src/`. */
  readonly targetModule: string | null;
}

/** A scanned source file and the modules it depends on. */
export interface SourceFile {
  readonly path: string;
  readonly module: string;
  readonly imports: readonly SourceImport[];
}

/** A dependency that breaks the agreed architecture. */
export interface Violation {
  readonly file: string;
  readonly specifier: string;
  readonly message: string;
}

/**
 * Checks the dependency direction rules of doc/README.md against the real code.
 *
 * It parses relative imports of every `src/**\/*.ts` file and compares the
 * target module with the rule table below. A module that has no rule is itself
 * reported, so adding a module forces an explicit decision about its
 * dependencies (and therefore an entry in the revision record).
 */
export class ArchitectureChecker {
  /** Heuristic: `import … from 'x'`, `import type … from 'x'`, `import 'x'`. */
  static readonly IMPORT_PATTERN = /(?:from\s*|import\s*)['"]([^'"]+)['"]/g;

  static readonly DEFAULT_RULES: readonly DependencyRule[] = [
    { module: 'errors', allowed: [] },
    { module: 'ports', allowed: ['model'] },
    { module: 'model', allowed: ['model', 'errors'] },
    { module: 'factory', allowed: ['factory', 'model', 'errors'] },
    { module: 'io', allowed: ['io', 'model', 'errors', 'ports', 'factory'] },
    { module: 'commands', allowed: ['commands', 'model', 'errors', 'ports', 'factory', 'history'] },
    { module: 'history', allowed: ['history', 'model', 'errors'] },
    { module: 'registry', allowed: ['registry', 'commands', 'model', 'errors'] },
    {
      module: 'cli',
      allowed: ['cli', 'commands', 'registry', 'history', 'io', 'model', 'errors', 'ports', 'factory'],
    },
  ];

  readonly #root: string;
  readonly #rules: ReadonlyMap<string, readonly string[]>;

  constructor(root: string, rules: readonly DependencyRule[] = ArchitectureChecker.DEFAULT_RULES) {
    this.#root = resolve(root);
    this.#rules = new Map(rules.map((rule) => [rule.module, rule.allowed]));
  }

  rules(): readonly DependencyRule[] {
    return [...this.#rules.entries()].map(([module, allowed]) => ({ module, allowed }));
  }

  scan(): SourceFile[] {
    return this.#sourceFiles(this.#root).map((file) => this.#analyse(file));
  }

  violations(): Violation[] {
    const result: Violation[] = [];
    for (const file of this.scan()) {
      const allowed = this.#rules.get(file.module);
      if (allowed === undefined) {
        result.push({
          file: file.path,
          specifier: '-',
          message: `module '${file.module}' has no dependency rule; declare one in ArchitectureChecker.DEFAULT_RULES`,
        });
        continue;
      }
      for (const imported of file.imports) {
        if (imported.targetModule === null || imported.targetModule === file.module) {
          continue;
        }
        if (!allowed.includes(imported.targetModule)) {
          result.push({
            file: file.path,
            specifier: imported.specifier,
            message: `'${file.module}' must not depend on '${imported.targetModule}' (imported ${imported.specifier})`,
          });
        }
      }
    }
    return result;
  }

  #sourceFiles(dir: string): string[] {
    const found: string[] = [];
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const full = join(dir, entry.name);
      if (entry.isDirectory()) {
        found.push(...this.#sourceFiles(full));
      } else if (entry.name.endsWith('.ts')) {
        found.push(full);
      }
    }
    return found.sort();
  }

  #analyse(file: string): SourceFile {
    const text = readFileSync(file, 'utf8');
    const imports: SourceImport[] = [];
    for (const match of text.matchAll(ArchitectureChecker.IMPORT_PATTERN)) {
      const specifier = match[1];
      if (specifier === undefined || !specifier.startsWith('.')) {
        continue;
      }
      const target = relative(this.#root, resolve(dirname(file), specifier)).split(sep).join('/');
      imports.push({
        specifier,
        targetModule: target.startsWith('..') ? null : (target.split('/')[0] ?? null),
      });
    }
    const path = relative(process.cwd(), file).split(sep).join('/');
    return {
      path,
      module: relative(this.#root, file).split(sep).join('/').split('/')[0] ?? '',
      imports,
    };
  }
}
