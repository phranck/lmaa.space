import assert from "node:assert/strict";
import test from "node:test";

import { categorizeInternalLink } from "../src/pipeline/research";

test("categorizeInternalLink prefers real utility pages over product slug false positives", () => {
  assert.deepEqual(
    categorizeInternalLink({
      url: "https://pegnitz-schrauben.de/Afnor-Kontaktscheiben-aus-Edelstahl",
      text: "AFNOR Scheiben",
      title: "",
    }),
    { category: null, score: 0 },
  );

  assert.deepEqual(
    categorizeInternalLink({
      url: "https://pegnitz-schrauben.de/Ueberwuerf-fuer-Zauntore",
      text: "Überwürf für Zauntore",
      title: "",
    }),
    { category: null, score: 0 },
  );

  assert.equal(
    categorizeInternalLink({
      url: "https://pegnitz-schrauben.de/Impressum",
      text: "Impressum",
      title: "",
    }).category,
    "legal",
  );

  assert.equal(
    categorizeInternalLink({
      url: "https://pegnitz-schrauben.de/Wir-ueber-uns",
      text: "Wir über uns",
      title: "",
    }).category,
    "about",
  );
});
