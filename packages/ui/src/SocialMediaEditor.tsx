import { normalizeSocialMediaValue } from "@lmaa/shared";
import { type ComponentType, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { LuGlobe, LuMinus, LuPlus } from "react-icons/lu";
import {
  SiBluesky,
  SiInstagram,
  SiLinkedin,
  SiMastodon,
  SiTiktok,
  SiTwitch,
  SiX,
  SiYoutube,
} from "react-icons/si";

interface PlatformDef {
  key: string;
  label: string;
  icon: ComponentType<{ size?: number }>;
}

const PLATFORMS: PlatformDef[] = [
  { key: "instagram", label: "Instagram", icon: SiInstagram },
  { key: "tiktok", label: "TikTok", icon: SiTiktok },
  { key: "youtube", label: "YouTube", icon: SiYoutube },
  { key: "twitch", label: "Twitch", icon: SiTwitch },
  { key: "x", label: "X", icon: SiX },
  { key: "bluesky", label: "Bluesky", icon: SiBluesky },
  { key: "mastodon", label: "Mastodon", icon: SiMastodon },
  { key: "linkedin", label: "LinkedIn", icon: SiLinkedin },
];

const PLATFORM_MAP = new Map(PLATFORMS.map((p) => [p.key, p]));

interface Entry {
  id: string;
  platform: string;
  handle: string;
}

/**
 * Localizable UI copy contract for the social media editor.
 */
export interface SocialMediaEditorMessages {
  handlePlaceholder: string;
  addAriaLabel: string;
  removeAriaLabel: string;
  selectPlatformAriaLabel: string;
}

/**
 * Props for the social media key-value editor component.
 */
export interface SocialMediaEditorProps {
  value: Record<string, string>;
  onChange: (value: Record<string, string>) => void;
  messages: SocialMediaEditorMessages;
}

let nextEntryId = 0;
function genId(): string {
  return `sme-${++nextEntryId}`;
}

function recordToEntries(record: Record<string, string>): Entry[] {
  return Object.entries(record).map(([platform, handle]) => ({
    id: genId(),
    platform,
    handle,
  }));
}

function entriesToRecord(entries: Entry[]): Record<string, string> {
  const record: Record<string, string> = {};
  for (const entry of entries) {
    if (entry.platform) {
      record[entry.platform] = entry.handle;
    }
  }
  return record;
}

/**
 * Dynamic key-value editor for social media links.
 *
 * Each row shows a platform icon dropdown, a handle/URL input,
 * and buttons to remove the entry or add a new one.
 */
export function SocialMediaEditor({ value, onChange, messages }: SocialMediaEditorProps) {
  const [entries, setEntries] = useState<Entry[]>(() => recordToEntries(value));
  const [openDropdownId, setOpenDropdownId] = useState<string | null>(null);
  const [dropdownRect, setDropdownRect] = useState<DOMRect | null>(null);
  const lastEmittedRef = useRef(JSON.stringify(value));
  const triggerRefs = useRef<Map<string, HTMLButtonElement>>(new Map());
  const portalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const serialized = JSON.stringify(value);
    if (serialized !== lastEmittedRef.current) {
      lastEmittedRef.current = serialized;
      setEntries(recordToEntries(value));
    }
  }, [value]);

  useEffect(() => {
    if (!openDropdownId) return;
    const capturedId = openDropdownId;
    function onMouseDown(e: MouseEvent) {
      const trigger = triggerRefs.current.get(capturedId);
      if (portalRef.current?.contains(e.target as Node) || trigger?.contains(e.target as Node)) {
        return;
      }
      setOpenDropdownId(null);
      setDropdownRect(null);
    }
    document.addEventListener("mousedown", onMouseDown);
    return () => document.removeEventListener("mousedown", onMouseDown);
  }, [openDropdownId]);

  function toggleDropdown(entryId: string) {
    if (openDropdownId === entryId) {
      setOpenDropdownId(null);
      setDropdownRect(null);
      return;
    }
    const trigger = triggerRefs.current.get(entryId);
    if (trigger) {
      setDropdownRect(trigger.getBoundingClientRect());
      setOpenDropdownId(entryId);
    }
  }

  function emit(next: Entry[]) {
    setEntries(next);
    const record = entriesToRecord(next);
    lastEmittedRef.current = JSON.stringify(record);
    onChange(record);
  }

  function addEntry() {
    emit([...entries, { id: genId(), platform: "", handle: "" }]);
  }

  function removeEntry(id: string) {
    if (openDropdownId === id) {
      setOpenDropdownId(null);
      setDropdownRect(null);
    }
    emit(entries.filter((e) => e.id !== id));
  }

  function selectPlatform(id: string, platform: string) {
    emit(entries.map((e) => (e.id === id ? { ...e, platform } : e)));
    setOpenDropdownId(null);
    setDropdownRect(null);
  }

  function updateHandle(id: string, handle: string) {
    emit(entries.map((e) => (e.id === id ? { ...e, handle } : e)));
  }

  function normalizeHandle(id: string) {
    const entry = entries.find((e) => e.id === id);
    if (!entry?.platform || !entry.handle) return;
    const normalized = normalizeSocialMediaValue(entry.platform, entry.handle);
    if (normalized && normalized !== entry.handle) {
      emit(entries.map((e) => (e.id === id ? { ...e, handle: normalized } : e)));
    }
  }

  const usedPlatforms = new Set(entries.map((e) => e.platform).filter(Boolean));

  const btnClass =
    "shrink-0 flex items-center justify-center w-9 border border-[var(--ds-border)] rounded-control transition-colors";

  const dropdown =
    openDropdownId && dropdownRect
      ? createPortal(
          <div
            ref={portalRef}
            style={{
              position: "fixed",
              top: dropdownRect.bottom + 4,
              left: dropdownRect.left,
              width: 192,
              zIndex: 50,
              backgroundColor: "var(--ds-input-bg, #ffffff)",
            }}
            className="border border-[var(--ds-border)] rounded-control shadow-lg overflow-hidden"
          >
            <div className="max-h-60 overflow-y-auto py-1">
              {PLATFORMS.filter(
                (p) =>
                  p.key === entries.find((e) => e.id === openDropdownId)?.platform ||
                  !usedPlatforms.has(p.key),
              ).map((p) => {
                const isSelected = entries.find((e) => e.id === openDropdownId)?.platform === p.key;
                return (
                  <button
                    key={p.key}
                    type="button"
                    onClick={() => selectPlatform(openDropdownId, p.key)}
                    className={`flex items-center gap-2.5 w-full px-3 py-1.5 text-sm transition-colors ${
                      isSelected
                        ? "text-[var(--ds-text)] bg-[var(--ds-bg-elevated)]"
                        : "text-[var(--ds-text-muted)] hover:text-[var(--ds-text)] hover:bg-[var(--ds-bg-elevated)]"
                    }`}
                  >
                    <p.icon size={14} />
                    {p.label}
                  </button>
                );
              })}
            </div>
          </div>,
          document.body,
        )
      : null;

  return (
    <div className="flex flex-col gap-2">
      {entries.map((entry) => {
        const def = PLATFORM_MAP.get(entry.platform);
        const Icon = def?.icon ?? LuGlobe;

        return (
          <div key={entry.id} className="flex gap-2">
            {/* Combined platform dropdown + handle input */}
            <div className="flex flex-1 border border-[var(--ds-border)] rounded-control bg-[var(--ds-input-bg)] focus-within:ring-2 focus-within:ring-[var(--color-primary)]">
              <button
                type="button"
                ref={(el) => {
                  if (el) triggerRefs.current.set(entry.id, el);
                  else triggerRefs.current.delete(entry.id);
                }}
                onClick={() => toggleDropdown(entry.id)}
                aria-label={messages.selectPlatformAriaLabel}
                className="shrink-0 w-10 flex items-center justify-center border-r border-[var(--ds-border)] text-[var(--ds-text-muted)] hover:bg-[var(--ds-bg-elevated)] transition-colors"
              >
                <Icon size={16} />
              </button>

              <input
                type="text"
                value={entry.handle}
                onChange={(e) => updateHandle(entry.id, e.target.value)}
                onBlur={() => normalizeHandle(entry.id)}
                placeholder={messages.handlePlaceholder}
                className="flex-1 px-3 py-2 text-sm bg-transparent text-[var(--ds-text)] placeholder:text-[var(--ds-text-subtle)] focus:outline-none"
              />
            </div>

            {/* Remove entry */}
            <button
              type="button"
              onClick={() => removeEntry(entry.id)}
              aria-label={messages.removeAriaLabel}
              className={`${btnClass} text-[var(--ds-text-muted)] hover:border-red-400 hover:text-red-500`}
            >
              <LuMinus size={14} />
            </button>

            {/* Add entry */}
            <button
              type="button"
              onClick={addEntry}
              aria-label={messages.addAriaLabel}
              className={`${btnClass} text-[var(--ds-text-muted)] hover:border-[var(--ds-border-strong)] hover:text-[var(--ds-text)]`}
            >
              <LuPlus size={14} />
            </button>
          </div>
        );
      })}

      {entries.length === 0 && (
        <button
          type="button"
          onClick={addEntry}
          className="flex items-center gap-1.5 text-xs text-[var(--ds-text-muted)] hover:text-[var(--ds-text)] transition-colors self-start"
        >
          <LuPlus size={12} />
          {messages.addAriaLabel}
        </button>
      )}

      {dropdown}
    </div>
  );
}
