/**
 * CLI entry point.
 *
 * S0 bootstrap version: prints the banner and exits on EOF.
 * The real REPL loop replaces this body in stage S1 (see docs/plan.md).
 */
import { BANNER } from './banner.ts';

process.stdout.write(`${BANNER}\n`);
