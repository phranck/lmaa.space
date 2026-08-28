#!/usr/bin/env node
/**
 * Points git at the hooks this repository carries.
 *
 * Runs from the `prepare` script, so `npm install` sets it up and nobody has to
 * remember the command. The build containers install from a copy that has no
 * git history and no git binary, so anything that is not a working checkout is
 * left alone rather than failing the install.
 */

import { execFileSync } from "node:child_process";

const HOOKS_PATH = "scripts/hooks";

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
  } catch (error) {
    console.warn(`git hooks not installed: ${error.message}`);
  }
}
