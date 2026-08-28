/**
 * Ecosystem discovery — the live half of a CLAUDE.md.
 *
 * The config half is authored; this half is read from the machine at
 * generation time: skills (SKILL.md frontmatter), commands (*.md), and the
 * hooks + enabled plugins in the active settings.json.
 *
 * The frontmatter scan is intentionally naive (line-prefix match, not a YAML
 * parser) — carried over from the ai-home original for output parity.
 */
import { existsSync, readFileSync, readdirSync, realpathSync } from "node:fs";
import { homedir } from "node:os";
import { basename, dirname, join } from "node:path";
import type { Command, Hook, Skill } from "./nouns.ts";

/** os.path.expanduser + os.path.expandvars, applied in that order. */
export function expand(path: string): string {
  let p = path;
  if (p === "~") p = homedir();
  else if (p.startsWith("~/")) p = join(homedir(), p.slice(2));
  p = p.replace(/\$\{(\w+)\}|\$(\w+)/g, (match, braced, bare) => {
    const name = braced ?? bare;
    const val = process.env[name];
    return val === undefined ? match : val;
  });
  return p;
}

/** The settings.json the running Claude Code actually reads. */
export function defaultSettingsPath(): string {
  const configDir = process.env["CLAUDE_CONFIG_DIR"];
  if (configDir) return join(expand(configDir), "settings.json");
  return join(homedir(), ".claude", "settings.json");
}

function strip(s: string): string {
  return s.replace(/^\s+|\s+$/g, "");
}

function stripQuotes(s: string): string {
  return s.replace(/^"+|"+$/g, "");
}

/** Immediate-subdir glob of SKILL.md one level under base, sorted. */
function globSkillMd(base: string): string[] {
  const hits: string[] = [];
  let entries: string[];
  try {
    entries = readdirSync(base, { withFileTypes: true })
      .filter((e) => e.isDirectory() || e.isSymbolicLink())
      .map((e) => e.name);
  } catch {
    return hits;
  }
  for (const sub of entries) {
    const candidate = join(base, sub, "SKILL.md");
    if (existsSync(candidate)) hits.push(candidate);
  }
  return hits.sort();
}

export function discoverSkills(skillsDir: string): Skill[] {
  const skills: Skill[] = [];
  const seenRealPaths = new Set<string>();
  const base = expand(skillsDir);
  if (!existsSync(base)) return skills;

  for (const skillMd of globSkillMd(base)) {
    // Resolve symlinks to avoid duplicates (e.g. pr:checklist -> pr-checklist)
    let real: string;
    try {
      real = realpathSync(skillMd);
    } catch {
      real = skillMd;
    }
    if (seenRealPaths.has(real)) continue;
    seenRealPaths.add(real);

    const folder = basename(dirname(skillMd));
    let name = folder;
    let description = "";
    try {
      const text = readFileSync(skillMd, "utf8");
      let inFrontmatter = false;
      for (const line of text.split("\n")) {
        if (strip(line) === "---") {
          inFrontmatter = !inFrontmatter;
          continue;
        }
        if (inFrontmatter) {
          if (line.startsWith("name:")) {
            name = stripQuotes(strip(line.split(/:(.*)/s)[1] ?? ""));
          } else if (line.startsWith("description:")) {
            description = stripQuotes(strip(line.split(/:(.*)/s)[1] ?? ""));
          }
        }
      }
    } catch {
      // leave name=folder, description=""
    }
    skills.push({ name, folder, description });
  }

  return skills;
}

export function discoverCommands(commandsDir: string): Command[] {
  const commands: Command[] = [];
  const base = expand(commandsDir);
  if (!existsSync(base)) return commands;

  let files: string[];
  try {
    files = readdirSync(base).filter((f) => f.endsWith(".md")).sort();
  } catch {
    return commands;
  }

  for (const file of files) {
    const cmdName = file.slice(0, -".md".length);
    let description = "";
    try {
      for (const line of readFileSync(join(base, file), "utf8").split("\n")) {
        const stripped = strip(line);
        if (stripped && !stripped.startsWith("#") && !stripped.startsWith("Run")) {
          description = stripped.slice(0, 100);
          break;
        }
      }
    } catch {
      // leave description=""
    }
    commands.push({ name: cmdName, description });
  }

  return commands;
}

const HOOK_EVENTS = [
  "SessionStart",
  "PreCompact",
  "PreToolUse",
  "PostToolUse",
  "Stop",
  "UserPromptSubmit",
  "SubagentStop",
  "WorktreeCreate",
  "WorktreeRemove",
  "Notification",
];

export function discoverHooks(settingsPath: string): Hook[] {
  const hooks: Hook[] = [];
  const path = expand(settingsPath);
  if (!existsSync(path)) return hooks;
  try {
    const data = JSON.parse(readFileSync(path, "utf8"));
    const hookData = "hooks" in data ? data.hooks : data;
    for (const event of HOOK_EVENTS) {
      const entries = hookData[event] ?? [];
      for (const entry of entries) {
        for (const hook of entry.hooks ?? []) {
          const cmd = hook.command ?? "";
          if (cmd) hooks.push({ event, command: cmd });
        }
      }
    }
  } catch {
    // leave hooks=[]
  }
  return hooks;
}

export function discoverPlugins(settingsPath: string): string[] {
  const path = expand(settingsPath);
  if (!existsSync(path)) return [];
  try {
    const data = JSON.parse(readFileSync(path, "utf8"));
    const enabled = data.enabledPlugins ?? {};
    return Object.keys(enabled).filter((k) => enabled[k]);
  } catch {
    return [];
  }
}
