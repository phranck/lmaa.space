import { describe, expect, it } from "vitest";

import { extractJsonObject } from "../services/review/prompt.js";

/**
 * The shape job 36 answered with: a complete verdict, then the same verdict
 * again, cut off by the token ceiling part way through its evidence list.
 *
 * @remarks
 * Taken from what attempt 9 actually sent. The repetition matters because it
 * puts the last closing brace inside a nested array of the second object, so
 * everything from the first brace to the last one parses as nothing.
 */
const REPEATED_ANSWER = `{
  "schemaVersion": "2",
  "verdict": "accept",
  "criteria": { "basedInEurope": "pass" },
  "accept": {
    "name": "The English Tea Shop",
    "description": "Ein Satz mit \\"Anführungszeichen\\" und einer Klammer }.",
    "evidence": [{ "url": "https://example.com/a" }]
  },
  "reject": null,
  "onhold": null
}\`\`\`json
{
  "schemaVersion": "2",
  "verdict": "accept",
  "evidence": [
    { "url": "https://example.com/b" },
    {
      "url": "https://example.com/Im`;

describe("extractJsonObject", () => {
  it("reads a plain JSON answer", () => {
    expect(extractJsonObject('{"verdict":"onhold"}')).toEqual({ verdict: "onhold" });
  });

  it("takes the first verdict when the model wrote it twice", () => {
    // Nine attempts on one shop cost 1,31 EUR because this came back as
    // nothing, whilst the first answer in it was complete every time.
    const parsed = extractJsonObject(REPEATED_ANSWER) as Record<string, unknown>;

    expect(parsed).not.toBeNull();
    expect(parsed.verdict).toBe("accept");
    expect((parsed.accept as { name: string }).name).toBe("The English Tea Shop");
  });

  it("does not end the object on a brace inside a string", () => {
    // A label carrying a brace would otherwise close the object in the wrong
    // place and lose everything after it.
    const parsed = extractJsonObject('{"a":"eine } Klammer","c":1} Nachwort') as Record<
      string,
      unknown
    >;

    expect(parsed.c).toBe(1);
  });

  it("does not end a string on an escaped quotation mark", () => {
    // A German quotation mark inside a description arrives escaped, and
    // treating that quote as the end of the string would put the scanner back
    // outside a string it is still inside.
    const parsed = extractJsonObject(String.raw`{"a":"ein \" Zitat }","c":1} Nachwort`) as Record<
      string,
      unknown
    >;

    expect(parsed.c).toBe(1);
  });

  it("still answers with nothing when the first object never closes", () => {
    // The other failure of that job: the ceiling cut the first verdict itself,
    // so there is no complete answer to take.
    expect(extractJsonObject('{"verdict":"accept","accept":{"name":"Abge')).toBeNull();
  });

  it("answers with nothing for an answer that carries no object", () => {
    expect(extractJsonObject("Gerne! Hier meine Einschätzung.")).toBeNull();
    expect(extractJsonObject("")).toBeNull();
  });
});
