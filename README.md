# verb-claude-md

CLAUDE.md verbs, authored once as typed
[verbspec](https://github.com/bounded-systems/verbspec) specs and projected to
CLI, MCP, Anthropic tool-use and OpenAPI.

A `CLAUDE.md` has two halves: an **authored** half (edit-tool rules, PR norms,
local-tool notes — a `claude.config.json`) and a **live** half (the skills,
commands, hooks and plugins actually present on the machine). This tool
validates the first, discovers the second, and projects both into one
generated file.

| verb | question |
| --- | --- |
| `generate` | What should this machine's CLAUDE.md say right now? |
| `validate` | Is this claude.config.json well-formed? |

## Run

```sh
bun install
bun run src/cli.ts generate ~/.config/claude/claude.config.json ~/CLAUDE.md
bun run src/cli.ts generate --print          # stdout, touch nothing
bun run src/cli.ts validate ~/.config/claude/claude.config.json
bun run src/cli.ts --mcp-tools               # the agent-facing surface, derived
```

## Config

`version` and `ecosystem` are the only required keys; every rendered section
appears only when its config key does.

```jsonc
{
  "version": "1.0.0",
  "ecosystem": {
    "skills_dir": "~/.config/claude/skills",     // folders with SKILL.md
    "commands_dir": "~/.config/claude/commands", // *.md command files
    "settings_path": "~/.config/claude/settings.json" // hooks + plugins source;
                          // defaults to $CLAUDE_CONFIG_DIR/settings.json
  },
  "managed": {
    // Replaces the header this tool's ancestor hardcoded. Say how the file is
    // actually managed, or omit for a plain generated-file note.
    "header": ["Deployed by home-manager from bdelanghe/home."],
    "regenerate_command": "verb-claude-md generate"
  },
  "environment": { "nix": true, "preferred_edit_tool": "Edit" },
  "code_changes": { "scope_rule": "…" },
  "pr_workflow": { "ci_pending_is_hard_block": true, "checklist": true },
  "static": { "local_tools": "…any markdown…" } // key → Title Case heading
}
```

## Provenance

Extracted from `ai-home/claude/scripts/generate_claude_md.ts` (itself a port
of a Python original) when ai-home was deprecated. The machine-specific header
it hardcoded — "managed by home-manager … run `prx home update`" — described
machinery that no longer exists; here that header is the config's own
`managed` block, so the file can never again claim an update command that
doesn't exist.

## Home Manager

```nix
inputs.verb-claude-md.url = "github:bounded-systems/verb-claude-md";
# …
imports = [ inputs.verb-claude-md.homeManagerModules.default ];
programs.verb-claude-md.enable = true;
```
