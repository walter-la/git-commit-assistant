#!/usr/bin/env node

const { spawnSync } = require("node:child_process");

function parseArgs(argv) {
  const options = {
    includeUntracked: true,
    ignorePatterns: [],
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];

    if (arg === "--no-untracked") {
      options.includeUntracked = false;
      continue;
    }

    if (arg === "--ignore") {
      const pattern = argv[i + 1];
      if (!pattern) {
        throw new Error("Missing value for --ignore");
      }
      options.ignorePatterns.push(pattern);
      i += 1;
      continue;
    }

    throw new Error(`Unknown argument: ${arg}`);
  }

  return options;
}

function runGit(args, options = {}) {
  const result = spawnSync("git", args, {
    encoding: options.encoding ?? "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });

  if (result.error) {
    throw result.error;
  }

  if (result.status !== 0) {
    const stderr = (result.stderr || "").trim();
    const stdout = (result.stdout || "").trim();
    throw new Error(`git ${args.join(" ")} failed: ${stderr || stdout}`);
  }

  return result.stdout;
}

function matchesIgnorePattern(filePath, patterns) {
  return patterns.some((pattern) => {
    if (!pattern) {
      return false;
    }

    const escaped = pattern.replace(/[.+^${}()|[\]\\]/g, "\\$&").replace(/\*/g, ".*").replace(/\?/g, ".");
    const regex = new RegExp(`^${escaped}$`);
    return regex.test(filePath);
  });
}

function parseStatusEntries(buffer) {
  const entries = [];
  const rawEntries = buffer.toString("utf8").split("\0").filter(Boolean);

  for (let i = 0; i < rawEntries.length; i += 1) {
    const entry = rawEntries[i];
    const code = entry.slice(0, 2);
    const payload = entry.slice(3);
    let path = payload;
    let originalPath = null;

    if (code[0] === "R" || code[0] === "C") {
      originalPath = payload;
      i += 1;
      if (i >= rawEntries.length) {
        throw new Error("Unexpected rename/copy entry without destination path.");
      }
      path = rawEntries[i];
    }

    entries.push({
      index_status: code[0],
      worktree_status: code[1],
      code,
      path,
      original_path: originalPath,
    });
  }

  return entries;
}

function safeGitDiff(args) {
  const result = spawnSync("git", args, {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });

  if (result.error || result.status !== 0) {
    return "";
  }

  return (result.stdout || "").trim();
}

function main() {
  const options = parseArgs(process.argv.slice(2));
  const conflictCodes = new Set(["DD", "AU", "UD", "UA", "DU", "AA", "UU"]);

  const repoRoot = runGit(["rev-parse", "--show-toplevel"]).trim();
  const porcelain = runGit(["status", "--porcelain=v1", "-z"], { encoding: null });
  const entries = parseStatusEntries(porcelain);

  const reportEntries = entries
    .filter((entry) => options.includeUntracked || entry.code !== "??")
    .filter((entry) => !matchesIgnorePattern(entry.path, options.ignorePatterns))
    .map((entry) => {
      const stagedNumstat =
        entry.code === "??" ? "" : safeGitDiff(["diff", "--cached", "--numstat", "--", entry.path]);
      const unstagedNumstat =
        entry.code === "??" ? "" : safeGitDiff(["diff", "--numstat", "--", entry.path]);

      return {
        path: entry.path,
        original_path: entry.original_path,
        code: entry.code,
        index_status: entry.index_status,
        worktree_status: entry.worktree_status,
        has_conflict: conflictCodes.has(entry.code),
        is_untracked: entry.code === "??",
        staged_numstat: stagedNumstat,
        unstaged_numstat: unstagedNumstat,
      };
    });

  const report = {
    repo_root: repoRoot,
    has_changes: reportEntries.length > 0,
    has_conflicts: reportEntries.some((entry) => entry.has_conflict),
    entries: reportEntries,
  };

  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
}

try {
  main();
} catch (error) {
  process.stderr.write(`${error.message}\n`);
  process.exit(1);
}
