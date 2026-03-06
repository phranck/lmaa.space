import { useEffect, useRef, useState } from "react";

import { ThemeSegmentedControl } from "@/components/ui/ThemeSegmentedControl.tsx";
import { useI18n } from "@/context/I18nContext.tsx";
import { api } from "@/lib/api.ts";

interface EmailPreviewProps {
  headerBannerUrl: string;
  headerText: string;
  bodyText: string;
  footerBannerUrl: string;
  footerText: string;
}

/**
 * Live email preview rendered in an isolated iframe.
 * Fetches rendered HTML from the backend preview endpoint so the output is
 * always identical to what recipients receive.
 */
export function EmailPreview({
  headerBannerUrl,
  headerText,
  bodyText,
  footerBannerUrl,
  footerText,
}: EmailPreviewProps) {
  const { messages } = useI18n();
  const m = messages.emailTemplates;
  const [colorScheme, setColorScheme] = useState<"light" | "dark">("light");
  const [srcDoc, setSrcDoc] = useState("");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      api
        .post<{ html: string }>("/admin/email-templates/preview", {
          headerBannerUrl: headerBannerUrl || null,
          headerText: headerText || null,
          bodyText,
          footerText: footerText || null,
          footerBannerUrl: footerBannerUrl || null,
          colorScheme,
        })
        .then(({ html }) => setSrcDoc(html))
        .catch(() => {});
    }, 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [headerBannerUrl, headerText, bodyText, footerText, footerBannerUrl, colorScheme]);

  return (
    <div className="flex flex-col h-full">
      <div className="px-5 py-3 shrink-0 flex items-center justify-between">
        <span className="text-xs font-semibold text-[var(--ds-text-muted)] uppercase tracking-wide">
          {m.preview}
        </span>
        <ThemeSegmentedControl
          value={colorScheme}
          onChange={(v) => {
            if (v !== "system") setColorScheme(v);
          }}
          options={["light", "dark"]}
        />
      </div>
      <div className="flex-1 overflow-hidden">
        <iframe
          srcDoc={srcDoc}
          className="w-full h-full border-0"
          title={m.previewTitle}
          sandbox="allow-same-origin"
        />
      </div>
    </div>
  );
}
