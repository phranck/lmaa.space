import { ShopcheckEngine } from "../../engine";
import type { PromptState } from "../../types";

export function handlePromptInput({
  prompt,
  input,
  key,
  setPrompt,
  engine,
}: {
  prompt: PromptState;
  input: string;
  key: {
    upArrow?: boolean;
    downArrow?: boolean;
    leftArrow?: boolean;
    rightArrow?: boolean;
    return?: boolean;
    escape?: boolean;
    ctrl?: boolean;
    backspace?: boolean;
    delete?: boolean;
  };
  setPrompt: (next: PromptState | ((prev: PromptState) => PromptState)) => void;
  engine: ShopcheckEngine;
}): boolean {
  if (prompt?.type === "startMode") {
    if (key.upArrow || key.leftArrow) setPrompt({ ...prompt, cursor: 0 });
    if (key.downArrow || key.rightArrow) setPrompt({ ...prompt, cursor: 1 });
    if (key.return) {
      prompt.resolve(prompt.cursor === 0 ? "resume" : "reset");
      setPrompt(null);
    }
    return true;
  }

  if (prompt?.type === "provider") {
    if (key.upArrow) setPrompt({ ...prompt, cursor: Math.max(0, prompt.cursor - 1) });
    if (key.downArrow) setPrompt({ ...prompt, cursor: Math.min(prompt.options.length - 1, prompt.cursor + 1) });
    if (key.return) {
      const selected = prompt.options[prompt.cursor];
      if (selected) prompt.resolve(selected.value);
      setPrompt(null);
    }
    return true;
  }

  if (prompt?.type === "batchSize") {
    if (key.upArrow) setPrompt({ ...prompt, cursor: Math.max(0, prompt.cursor - 1) });
    if (key.downArrow) setPrompt({ ...prompt, cursor: Math.min(prompt.options.length - 1, prompt.cursor + 1) });
    if (key.return) {
      const selected = prompt.options[prompt.cursor];
      prompt.resolve(selected ? selected.value : null);
      setPrompt(null);
    }
    return true;
  }

  return false;
}
