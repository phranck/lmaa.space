import { describe, expect, it } from "vitest";

import { MAX_NODE_LENGTH, tokenizeShortcodes } from "./markdown-shortcode-tokenizer.js";

describe("tokenizeShortcodes", () => {
  it("reads a bare token", () => {
    const [node] = tokenizeShortcodes("[[rejected-shops-table]]");
    expect(node.token).toBe("rejected-shops-table");
    expect(node.attributes).toEqual({});
    expect(node.children).toEqual([]);
  });

  it("reads a target after the colon", () => {
    const [node] = tokenizeShortcodes('[[image:/uploads/a.png alt="Ein Bild"]]');
    expect(node.token).toBe("image");
    expect(node.target).toBe("/uploads/a.png");
    expect(node.attributes.alt).toBe("Ein Bild");
  });

  it("treats a bare name as a flag", () => {
    const [node] = tokenizeShortcodes("[[bankaccount recommended]]");
    expect(node.attributes.recommended).toBe(true);
  });

  it("reads an unquoted numeric value", () => {
    const [node] = tokenizeShortcodes("[[option amount=15]]");
    expect(node.attributes.amount).toBe("15");
  });

  it("nests children to any depth", () => {
    const content = [
      "[[support-ladder",
      "  [[bankaccount",
      '    iban="AT55"',
      '    [[variant key="once" title="Überweisung"]]',
      "  ]]",
      "]]",
    ].join("\n");

    const [ladder] = tokenizeShortcodes(content);
    expect(ladder.token).toBe("support-ladder");
    expect(ladder.children).toHaveLength(1);

    const [account] = ladder.children;
    expect(account.token).toBe("bankaccount");
    expect(account.attributes.iban).toBe("AT55");
    expect(account.children).toHaveLength(1);
    expect(account.children[0].token).toBe("variant");
    expect(account.children[0].attributes.title).toBe("Überweisung");
  });

  it("returns only top-level nodes", () => {
    const nodes = tokenizeShortcodes("[[a [[b]] ]] text [[c]]");
    expect(nodes.map((node) => node.token)).toEqual(["a", "c"]);
    expect(nodes[0].children.map((node) => node.token)).toEqual(["b"]);
  });

  it("keeps a closing pair inside a quoted value as text", () => {
    const [node] = tokenizeShortcodes('[[interval text="Das sind [[annualAmount]] im Jahr." key="m"]]');
    expect(node.attributes.text).toBe("Das sind [[annualAmount]] im Jahr.");
    expect(node.attributes.key).toBe("m");
    expect(node.children).toEqual([]);
  });

  it("keeps a single closing bracket in prose as text", () => {
    const [node] = tokenizeShortcodes('[[option text="Ein Satz mit ] darin."]]');
    expect(node.attributes.text).toBe("Ein Satz mit ] darin.");
  });

  it("keeps a newline inside a quoted value", () => {
    const [node] = tokenizeShortcodes('[[option text="erste\nzweite"]]');
    expect(node.attributes.text).toBe("erste\nzweite");
  });

  it("keeps every occurrence of a repeated attribute, in order", () => {
    const [node] = tokenizeShortcodes('[[x once="a" once="b"]]');
    expect(node.rawAttributes.filter((a) => a.name === "once").map((a) => a.value)).toEqual([
      "a",
      "b",
    ]);
  });

  it("skips an opener escaped with a backslash", () => {
    expect(tokenizeShortcodes("\\[[image:/a.png]]")).toHaveLength(0);
  });

  it("ignores an opener that never closes", () => {
    expect(tokenizeShortcodes("[[image:/uploads/a.png alt=x")).toHaveLength(0);
  });

  it("does not swallow a later node from a stray opener", () => {
    const content = ["[[image:/uploads/a.png", "x".repeat(MAX_NODE_LENGTH + 100), "[[image:/uploads/b.png]]"].join(
      "\n",
    );
    const nodes = tokenizeShortcodes(content);
    expect(nodes).toHaveLength(1);
    expect(nodes[0].target).toBe("/uploads/b.png");
  });

  it("records an unterminated quoted value rather than throwing", () => {
    const nodes = tokenizeShortcodes('[[option text="offen');
    expect(nodes).toHaveLength(0);
  });

  it("reports the source span of each node", () => {
    const content = "vor [[a]] nach";
    const [node] = tokenizeShortcodes(content);
    expect(content.slice(node.source.start, node.source.end)).toBe("[[a]]");
    expect(node.source.raw).toBe("[[a]]");
  });
});
