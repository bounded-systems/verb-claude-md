/**
 * The things these verbs talk about.
 *
 * The config schema is deliberately loose where the original (ai-home's
 * generate_claude_md.ts) was strict: `version` and `ecosystem` are the only
 * required keys, and every rendered section appears only when its config key
 * does. That is what makes the tool generic — it renders the machine you
 * describe, not the machine it was extracted from.
 */
import { z } from "zod";

/** Wrap an output shape with the contract version every verb here emits. */
export const versioned = <T extends z.ZodRawShape>(shape: T) =>
  z.object({ schema_version: z.number(), ...shape });

export const SCHEMA_VERSION = 1;

export const Skill = z.object({
  name: z.string(),
  folder: z.string(),
  description: z.string(),
});
export type Skill = z.infer<typeof Skill>;

export const Command = z.object({
  name: z.string(),
  description: z.string(),
});
export type Command = z.infer<typeof Command>;

export const Hook = z.object({
  event: z.string(),
  command: z.string(),
});
export type Hook = z.infer<typeof Hook>;

/**
 * claude.config.json — the JSON source of truth a CLAUDE.md is projected from.
 *
 * `managed` replaces the header that used to be hardcoded (home-manager /
 * ai-home / `prx home update` — machinery that no longer exists). A config
 * says how its CLAUDE.md is managed, or gets a plain "generated — do not
 * edit; regenerate with …" comment.
 */
export const ClaudeConfig = z.object({
  $schema: z.string().optional(),
  version: z.string(),
  ecosystem: z.object({
    /** Directory holding skill folders (each with a SKILL.md). */
    skills_dir: z.string().optional(),
    /** Directory holding command markdown files. */
    commands_dir: z.string().optional(),
    /**
     * settings.json to read hooks + enabled plugins from. Defaults to
     * `$CLAUDE_CONFIG_DIR/settings.json`, falling back to `~/.claude`.
     */
    settings_path: z.string().optional(),
  }).loose(),
  managed: z.object({
    /** Extra blockquote lines rendered under the generated-file warning. */
    header: z.array(z.string()).optional(),
    /** Command a reader runs to regenerate the file. */
    regenerate_command: z.string().optional(),
  }).optional(),
  environment: z.object({
    nix: z.boolean().optional(),
    preferred_edit_tool: z.enum(["Edit", "Write"]).optional(),
    language: z.string().optional(),
    test_framework: z.string().optional(),
  }).loose().optional(),
  code_changes: z.object({
    scope_rule: z.string().optional(),
  }).loose().optional(),
  pr_workflow: z.object({
    ci_pending_is_hard_block: z.boolean().optional(),
    never_local_merge_to_protected: z.boolean().optional(),
    resolve_threads: z.union([z.boolean(), z.string()]).optional(),
    /** Set false to omit the run-sheet checklist. */
    checklist: z.boolean().optional(),
  }).loose().optional(),
  /** Free-form sections: key → markdown body, rendered under a Title Case heading. */
  static: z.record(z.string(), z.string()).optional(),
}).loose();
export type ClaudeConfig = z.infer<typeof ClaudeConfig>;
