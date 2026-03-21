import assert from "node:assert/strict";
import test from "node:test";

import {
  containsForbiddenDashes,
  findAsciiGermanSpellingHints,
  getForbiddenDashViolation,
  getGermanSpellingViolation,
} from "../src/lib/text-rules";

test("text rule detects forbidden dash characters", () => {
  assert.equal(containsForbiddenDashes("Von Seglern für Segler – Expertenwissen"), true);
  assert.equal(containsForbiddenDashes("Sauber formulierte Saetze ohne Sonderstriche."), false);
  assert.deepEqual(
    getForbiddenDashViolation("A — B", "description"),
    { field: "description", reason: "description enthält einen verbotenen Gedankenstrich (– oder —)." },
  );
});

test("text rule detects ascii umlaut and eszett replacements", () => {
  assert.deepEqual(
    findAsciiGermanSpellingHints("Das ist fuer Segler eine grosse Hilfe auf hoher See."),
    ["fuer", "grosse"],
  );
  assert.deepEqual(
    getGermanSpellingViolation("Das ist fuer Segler eine grosse Hilfe auf hoher See.", "description"),
    {
      field: "description",
      reason: "description verwendet ASCII-Umschreibungen statt echter deutscher Umlaute oder ß (fuer, grosse).",
    },
  );
  assert.equal(getGermanSpellingViolation("Das ist für Segler eine große Hilfe auf hoher See.", "description"), null);
});
