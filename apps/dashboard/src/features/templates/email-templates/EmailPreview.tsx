import { EyeIcon } from "@phosphor-icons/react";
import { useEffect, useRef, useState } from "react";

import { DashboardSection } from "@lmaa/ui/dashboard-section";

import {
  ColorSchemeSegmentedControl,
  type ColorScheme,
} from "@/components/ui/ColorSchemeSegmentedControl.tsx";
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
  const [srcDoc, setSrcDoc] = useState("");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Light to begin with, which is what a mail client shows unless its reader
  // asked for the other one.
  const [colorScheme, setColorScheme] = useState<ColorScheme>("light");

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
        .then(({ html }) => setSrcDoc(() => html))
        .catch(() => {});
    }, 800);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [headerBannerUrl, headerText, bodyText, footerText, footerBannerUrl, colorScheme]);

  return (
    <DashboardSection className="flex h-full min-h-0 flex-col overflow-hidden">
      <DashboardSection.Header
        icon={<EyeIcon weight="duotone" className="size-4" />}
        title={m.previewTitle}
        addOn={<ColorSchemeSegmentedControl value={colorScheme} onChange={setColorScheme} />}
      />
      <DashboardSection.Body className="min-h-0 flex-1 !gap-0 !p-0">
        <iframe
          srcDoc={srcDoc}
          className="w-full h-full border-0"
          title={m.previewTitle}
          sandbox="allow-same-origin"
        />
      </DashboardSection.Body>
    </DashboardSection>
  );
}
