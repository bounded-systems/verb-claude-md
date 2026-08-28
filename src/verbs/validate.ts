import { z } from "zod";
import { defineVerb } from "@bounded-systems/verbspec";
import { readFileSync } from "node:fs";
import { ClaudeConfig, SCHEMA_VERSION, versioned } from "../nouns.ts";
import { expand } from "../discover.ts";

const Output = versioned({
  config: z.string(),
  valid: z.boolean(),
  errors: z.array(z.string()),
});

export const validate = defineVerb({
  id: "validate",
  summary: "Validate a claude.config.json against the schema, without writing anything",
  actor: "observer",
  positionals: ["config"],
  input: z.object({
    config: z.string().default("~/.config/claude/claude.config.json"),
  }),
  output: Output,

  run: ({ config }) => {
    const path = expand(config);
    let errors: string[] = [];
    try {
      const parsed = ClaudeConfig.safeParse(JSON.parse(readFileSync(path, "utf8")));
      if (!parsed.success) {
        errors = parsed.error.issues.map((i) => `${i.path.join(".") || "(root)"}: ${i.message}`);
      }
    } catch (e) {
      errors = [String(e instanceof Error ? e.message : e)];
    }
    return { schema_version: SCHEMA_VERSION, config: path, valid: errors.length === 0, errors };
  },

  render: (o) => (o.valid ? "Valid." : o.errors.map((e) => `  - ${e}`).join("\n")),
  exitCode: (o) => (o.valid ? 0 : 1),
});
