/**
 * Render a CLAUDE.md from a validated config plus discovered ecosystem.
 *
 * Every section is conditional on its config key. Nothing about any
 * particular machine, org, or (long gone) update command is hardcoded — the
 * header that used to claim "run `prx home update`" is now the config's own
 * `managed` block, or an honest one-line generated-file comment.
 */
import type { ClaudeConfig, Command, Hook, Skill } from "./nouns.ts";

/** Python str.capitalize() parity. */
function capitalize(s: string): string {
  if (!s) return s;
  return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
}

/** snake_case key → Title Case heading. */
function heading(key: string): string {
  return key
    .split(/[_-]/)
    .map((w) => (w ? w.charAt(0).toUpperCase() + w.slice(1) : w))
    .join(" ");
}

const PR_CHECKLIST = `Use the following checklist as a run sheet on every PR:

1. [x] **Independent PR** — no bundled or speculative changes
   - [x] Verified: <scope of change>
2. [x] **Changed codepaths verified** — targeted unit and full integration tests
   - [x] Verified: <test name>
3. [x] **Root cause identified** — every failure traced to source
   - [x] <root cause summary>
4. [x] **No duplication** — refactoring preferred over copy/paste
   - [x] <what was refactored>
5. [x] **No unrelated changes** — housekeeping isolated to its own branch
   - [x] N/A or <branch name>

Success looks like PRs consistently including this checklist with items checked off, leading to tighter scope, clearer reviews, and faster, lower-friction merges.`;

export type Discovered = {
  skills: Skill[];
  commands: Command[];
  hooks: Hook[];
  plugins: string[];
};

export function render(config: ClaudeConfig, d: Discovered, configPath: string): string {
  const env = config.environment;
  const code = config.code_changes;
  const pr = config.pr_workflow;
  const eco = config.ecosystem;
  const managed = config.managed;
  const staticCfg = config.static ?? {};

  const lines: string[] = [];

  const regen = managed?.regenerate_command ?? `verb-claude-md generate ${configPath}`;
  lines.push(`<!-- generated from ${configPath} by verb-claude-md — do not edit directly -->`);
  lines.push("");
  lines.push("> [!NOTE]");
  lines.push(
    `> **This file is generated.** Edit \`${configPath}\`, then regenerate with \`${regen}\`.`,
  );
  for (const extra of managed?.header ?? []) {
    lines.push(`> ${extra}`);
  }
  lines.push("");

  // Ecosystem (discovery)
  lines.push("# Ecosystem");
  lines.push("");
  lines.push(`> Auto-generated discovery layer. Edit \`${configPath}\` and regenerate.`);
  lines.push("");

  if (d.skills.length) {
    lines.push(`## Skills (\`${eco.skills_dir}/\`)`);
    for (const s of d.skills) {
      const desc = s.description ? ` — ${s.description}` : "";
      lines.push(`- \`${s.name}\`${desc}`);
    }
    lines.push("");
  }

  if (d.commands.length) {
    lines.push(`## Commands (\`/command\` in Claude Code)`);
    for (const c of d.commands) {
      const desc = c.description ? ` — ${c.description}` : "";
      lines.push(`- \`/${c.name}\`${desc}`);
    }
    lines.push("");
  }

  if (d.hooks.length) {
    lines.push("## Active Hooks");
    for (const h of d.hooks) {
      lines.push(`- \`${h.event}\`: \`${h.command}\``);
    }
    lines.push("");
  }

  if (d.plugins.length) {
    lines.push("## Enabled Plugins");
    for (const p of d.plugins) {
      lines.push(`- \`${p}\``);
    }
    lines.push("");
  }

  // Environment
  if (env) {
    lines.push("# Environment");
    lines.push("");
    const tool = env.preferred_edit_tool ?? "Edit";
    if (env.nix) {
      lines.push(
        `- **Use the ${tool} tool instead of \`sed\`** for all file modifications. \`sed\` fails in this nix environment due to special characters and env differences. Never fall back to \`sed\`.`,
      );
    }
    if (env.language) {
      let langLine = `- This is a **${capitalize(env.language)} codebase**.`;
      if (env.test_framework) {
        langLine += ` Tests: ${capitalize(env.test_framework)}.`;
      }
      lines.push(langLine);
    }
    lines.push("");
  }

  // Code Changes
  if (code?.scope_rule) {
    lines.push("# Code Changes");
    lines.push("");
    lines.push(`- **Confirm scope before moving or extracting code.** ${code.scope_rule}`);
    lines.push("");
  }

  // PR Standards
  if (pr) {
    lines.push("# Pull Request Standards");
    lines.push("");
    lines.push(
      "Adhere to established PR norms: ship minimal, independent PRs and avoid bundled or speculative changes.",
    );
    lines.push("");
    if (pr.ci_pending_is_hard_block) {
      lines.push(
        "- **CI pending is a HARD BLOCK.** Never mark a PR ready for review while CI is running or failing.",
      );
    }
    if (pr.never_local_merge_to_protected) {
      lines.push(
        "- **Never merge into protected branches locally.** Use GitHub PRs to merge into `main` or other protected branches.",
      );
    }
    if (pr.resolve_threads) {
      lines.push(
        "- When resolving PR review threads: fix the code, push, then mark threads resolved on GitHub via API. Confirm resolution explicitly.",
      );
    }
    lines.push("");
    if (pr.checklist !== false) {
      lines.push(PR_CHECKLIST);
      lines.push("");
    }
  }

  // Free-form sections, in config order.
  for (const [key, body] of Object.entries(staticCfg)) {
    if (!body) continue;
    lines.push(`# ${heading(key)}`);
    lines.push("");
    lines.push(body);
    lines.push("");
  }

  return lines.join("\n");
}
