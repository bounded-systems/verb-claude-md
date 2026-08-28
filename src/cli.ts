#!/usr/bin/env bun
/**
 * CLI projection of the verb registry.
 *
 * Thin on purpose (the flake-verbs pattern): this CLI, the MCP toolset and
 * the OpenAPI operations are all projections of the same specs, so adding a
 * verb to the registry adds it to every surface at once.
 */
import { dispatch, render, toHelp, toMcpToolset } from "@bounded-systems/verbspec";
import { generate } from "./verbs/generate.ts";
import { validate } from "./verbs/validate.ts";

const registry = {
  generate,
  validate,
};

const argv = process.argv.slice(2);

if (argv[0] === "--mcp-tools") {
  console.log(JSON.stringify(toMcpToolset(registry), null, 2));
  process.exit(0);
}

if (argv.length === 0 || argv[0] === "--help") {
  console.log("CLAUDE.md verbs\n");
  for (const [id, v] of Object.entries(registry)) {
    console.log(`  ${id.padEnd(10)} ${v.summary}`);
  }
  console.log("\n  --mcp-tools    print the MCP toolset derived from these specs");
  console.log("\nRun a verb with --help for its flags.");
  process.exit(0);
}

if (argv[1] === "--help" && argv[0] in registry) {
  console.log(toHelp(registry[argv[0] as keyof typeof registry] as never, "verb-claude-md"));
  process.exit(0);
}

const result = await dispatch(registry, argv);

if (result.kind === "ok") {
  const spec = registry[result.id as keyof typeof registry] as {
    render?: (o: unknown, i: unknown) => string;
    warnings?: (o: unknown, i: unknown) => readonly string[];
    exitCode?: (o: unknown, i: unknown) => number;
  };
  for (const w of spec?.warnings?.(result.output, result.input) ?? []) {
    console.error(`warning: ${w}`);
  }
  console.log(spec?.render ? spec.render(result.output, result.input) : render(result.output));
  process.exit(spec?.exitCode?.(result.output, result.input) ?? 0);
} else {
  console.error(result.message ?? String(result.kind));
  process.exit(result.exitCode ?? 1);
}
