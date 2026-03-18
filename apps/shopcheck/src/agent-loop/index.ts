import type { AgentMessage } from "../llm/client";
import { LlmFatalError, llmChat } from "../llm/client";
import { TOOL_DEFINITIONS, executeTool } from "./tools";
import { buildSystemPrompt } from "./system-prompt";
import { parseFinishArgs, parseTextFallback, type AgentLoopResult } from "./output-parser";

export type { AgentLoopResult };

export type AgentLoopInput = {
  shopUrl: string;
  shopName: string;
  onProgress?: (msg: string) => void;
};

const MAX_TURNS = 25;

export async function runAgentLoop(input: AgentLoopInput): Promise<AgentLoopResult> {
  const { shopUrl, shopName, onProgress } = input;
  const log = (msg: string) => onProgress?.(msg);

  log("Building system prompt (loading criteria + categories)...");
  const system = await buildSystemPrompt();
  log(`System prompt ready (${system.length} chars).`);

  const messages: AgentMessage[] = [
    { role: "user", content: `Prüfe diesen Online-Shop: ${shopUrl}` },
  ];

  let lastText = "";
  // Track URLs actually fetched via fetch_page
  const fetchedUrls = new Set<string>();
  // Each validation check fires at most once to prevent death spirals
  let hasRequestedSubpageFetch = false;
  let hasRequestedQuellen = false;
  // Detect consecutive empty search results (DuckDuckGo blocking)
  let consecutiveEmptySearches = 0;

  for (let turn = 1; turn <= MAX_TURNS; turn++) {
    log(`[turn ${turn}/${MAX_TURNS}] Sending to LLM...`);

    let response: { text: string; toolCalls: import("../llm/client").ToolCall[] };
    try {
      response = await llmChat({
        system,
        messages,
        tools: TOOL_DEFINITIONS,
        maxTokens: 8192,
        temperature: 0.3,
      });
    } catch (err) {
      if (err instanceof LlmFatalError) throw err;
      throw new LlmFatalError(`Agent loop LLM error on turn ${turn}: ${err instanceof Error ? err.message : String(err)}`);
    }

    const { text, toolCalls } = response;
    if (text) lastText = text;

    log(`[turn ${turn}] Response: ${text.length} chars text, ${toolCalls.length} tool call(s)`);

    // Append assistant message to history
    messages.push({ role: "assistant", text, toolCalls });

    if (toolCalls.length === 0) {
      // No tool calls — agent finished with text or is stuck
      log(`[turn ${turn}] No tool calls. Attempting to parse text as final answer.`);
      return parseTextFallback(text, shopName, shopUrl);
    }

    // Check for finish() call first
    const finishCall = toolCalls.find((tc) => tc.name === "finish");
    if (finishCall) {
      const args = finishCall.arguments;

      if (String(args.verdict ?? "") === "reject") {
        // Structural check: has the agent fetched at least one subpage (not just root)?
        // Fetching only the homepage is insufficient for rejection — at minimum the
        // Impressum must be read to document the legal entity and ownership.
        const fetchedSubpages = [...fetchedUrls].filter((u) => {
          try {
            const path = new URL(u).pathname;
            return path.length > 1 && path !== "/";
          } catch {
            return false;
          }
        });

        if (fetchedSubpages.length === 0 && !hasRequestedSubpageFetch) {
          hasRequestedSubpageFetch = true;
          const base = shopUrl.replace(/\/$/, "");
          log(`[turn ${turn}] finish() reject but no subpages fetched — requiring Impressum fetch.`);
          messages.push({
            role: "tool",
            toolCallId: finishCall.id,
            toolName: "finish",
            content:
              "VORAUSSETZUNG NICHT ERFÜLLT: Du hast bisher nur die Homepage abgerufen. " +
              "Bevor du finish() aufrufen kannst, musst du mindestens das Impressum lesen. " +
              `Rufe jetzt fetch_page auf: ${base}/impressum\n` +
              "Falls /impressum nicht erreichbar ist, versuche: /impressum.html, /ueber-uns, /kontakt, /legal, /about\n" +
              "Das Impressum enthält Rechtsform, Eigentümer und Konzernzugehörigkeit — " +
              "diese Angaben müssen im Ablehnungstext mit korrekten Fußnoten belegt sein.",
          });
          continue;
        }

        // Output check: ### Quellen section is mandatory
        const longReason = String(args.long_reason ?? "");
        if (!longReason.includes("### Quellen") && !hasRequestedQuellen) {
          hasRequestedQuellen = true;
          log(`[turn ${turn}] finish() reject but ### Quellen missing — requesting revision.`);
          messages.push({
            role: "tool",
            toolCallId: finishCall.id,
            toolName: "finish",
            content:
              "FEHLER: Die long_reason enthält keinen ### Quellen-Abschnitt. " +
              "Ergänze am Ende einen vollständigen ### Quellen-Abschnitt mit allen URLs, " +
              "die du mit fetch_page abgerufen hast, und setze Inline-Fußnoten [^N] für jeden Fakt. " +
              "Rufe finish() erneut auf.",
          });
          continue;
        }
      }

      log(`[turn ${turn}] finish() called — extracting result.`);
      return parseFinishArgs(finishCall.arguments, shopName, shopUrl);
    }

    // Execute all other tool calls and append results
    for (const tc of toolCalls) {
      if (tc.name === "fetch_page") {
        const url = String(tc.arguments.url ?? "").trim();
        if (url.startsWith("http")) fetchedUrls.add(url);
      }
      const result = await executeTool(tc.name, tc.arguments, onProgress);
      log(`  Tool ${tc.name}: ${result.length} chars returned`);

      // Detect DuckDuckGo blocking: search_web returning "No results found." repeatedly
      let content = result;
      if (tc.name === "search_web") {
        if (result === "No results found." || result.trim().length < 25) {
          consecutiveEmptySearches += 1;
          if (consecutiveEmptySearches >= 3) {
            log(`[turn ${turn}] search_web returned empty ${consecutiveEmptySearches}x in a row — notifying agent.`);
            content =
              result +
              "\n\nHINWEIS: Die externe Suche liefert wiederholt keine Ergebnisse (möglicherweise blockiert). " +
              "Versuche stattdessen, Seiten des Shops direkt mit fetch_page abzurufen " +
              "(z. B. /impressum, /ueber-uns, /about, /corporate). " +
              "Falls keine externen Quellen verfügbar sind, zitiere ausschließlich die bereits abgerufenen Shop-Seiten " +
              "und rufe finish() auf.";
          }
        } else {
          consecutiveEmptySearches = 0;
        }
      }

      messages.push({
        role: "tool",
        toolCallId: tc.id,
        toolName: tc.name,
        content,
      });
    }
  }

  // Max turns exceeded — parse whatever the last text was
  log(`[warn] Max turns (${MAX_TURNS}) reached without finish(). Parsing last text.`);
  return parseTextFallback(lastText, shopName, shopUrl);
}
