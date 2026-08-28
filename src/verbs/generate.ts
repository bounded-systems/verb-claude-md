import { z } from "zod";
import { defineVerb } from "@bounded-systems/verbspec";
import { readFileSync, writeFileSync } from "node:fs";
import { ClaudeConfig, SCHEMA_VERSION, versioned } from "../nouns.ts";
import {
  defaultSettingsPath,
  discoverCommands,
  discoverHooks,
  discoverPlugins,
  discoverSkills,
  expand,
} from "../discover.ts";
import { render } from "../render.ts";

const Output = versioned({
  config: z.string(),
  output: z.string(),
  bytes: z.number(),
  skills: z.number(),
  commands: z.number(),
  hooks: z.number(),
  plugins: z.number(),
  /** Present (and the file untouched) when `print` was set. */
  content: z.string().optional(),
});

export const generate = defineVerb({
  id: "generate",
  summary: "Project a claude.config.json plus the live ecosystem (skills, commands, hooks, plugins) into a generated CLAUDE.md",
  actor: "work",
  positionals: ["config", "output"],
  input: z.object({
    config: z.string().default("~/.config/claude/claude.config.json"),
    output: z.string().default("~/CLAUDE.md"),
    /** Print to stdout instead of writing the output file. */
    print: z.boolean().default(false),
  }),
  output: Output,

  run: ({ config, output, print }) => {
    const configPath = expand(config);
    const parsed = ClaudeConfig.safeParse(JSON.parse(readFileSync(configPath, "utf8")));
    if (!parsed.success) {
      const issues = parsed.error.issues
        .map((i) => `${i.path.join(".") || "(root)"}: ${i.message}`)
        .join("; ");
      throw new Error(`invalid config ${configPath}: ${issues}`);
    }
    const cfg = parsed.data;
    const eco = cfg.ecosystem;

    const settingsPath = eco.settings_path ? expand(eco.settings_path) : defaultSettingsPath();
    const discovered = {
      skills: eco.skills_dir ? discoverSkills(eco.skills_dir) : [],
      commands: eco.commands_dir ? discoverCommands(eco.commands_dir) : [],
      hooks: discoverHooks(settingsPath),
      plugins: discoverPlugins(settingsPath),
    };

    const content = render(cfg, discovered, configPath);
    const outPath = expand(output);
    if (!print) writeFileSync(outPath, content);

    return {
      schema_version: SCHEMA_VERSION,
      config: configPath,
      output: outPath,
      bytes: content.length,
      skills: discovered.skills.length,
      commands: discovered.commands.length,
      hooks: discovered.hooks.length,
      plugins: discovered.plugins.length,
      ...(print ? { content } : {}),
    };
  },

  render: (o) =>
    o.content ??
    [
      `Generated: ${o.output} (${o.bytes} bytes)`,
      `  Skills discovered: ${o.skills}`,
      `  Commands discovered: ${o.commands}`,
      `  Hooks discovered: ${o.hooks}`,
      `  Plugins discovered: ${o.plugins}`,
    ].join("\n"),
});
