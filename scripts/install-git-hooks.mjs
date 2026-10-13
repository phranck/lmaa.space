#!/usr/bin/env node
/**
 * Points git at the hooks this repository carries, and at the list of
 * formatting-only commits that `git blame` skips.
 *
 * Runs from the `prepare` script, so `npm install` sets it up and nobody has to
 * remember the command. The build containers install from a copy that has no
 * git history and no git binary, so anything that is not a working checkout is
 * left alone rather than failing the install.
 */

import { execFileSync } from "node:child_process";

const HOOKS_PATH = "scripts/hooks";
const BLAME_IGNORE_REVS_FILE = ".git-blame-ignore-revs";

function isWorkingCheckout() {
  try {
    execFileSync("git", ["rev-parse", "--git-dir"], { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}

if (isWorkingCheckout()) {
  try {
    execFileSync("git", ["config", "core.hooksPath", HOOKS_PATH], { stdio: "ignore" });
    execFileSync("git", ["config", "blame.ignoreRevsFile", BLAME_IGNORE_REVS_FILE], {
      stdio: "ignore",
    });
  } catch (error) {
    console.warn(`git configuration not applied: ${error.message}`);
  }
}
