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
  const frameRef = useRef<HTMLIFrameElement | null>(null);
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

  // The frame is as tall as the email inside it, measured from the document
  // rather than asked for as a percentage of the card. `DashboardSection` puts
  // its collapse grid between the section and the body, so no definite height
  // reaches this far, and a percentage then resolves to the frame's intrinsic
  // 150 pixels, which cut off all but the banner.
  //
  // The height is watched rather than polled, because the banner is an image
  // that arrives after the document and makes the email taller once it does.
  // Each preview brings a new document and therefore needs its own observer,
  // which is why this runs again whenever the rendered email changes.
  useEffect(() => {
    const frame = frameRef.current;
    if (!frame) return;

    let observer: ResizeObserver | null = null;

    const fitToContent = () => {
      const root = frame.contentDocument?.documentElement;
      if (root) frame.style.height = `${root.scrollHeight}px`;
    };

    const onLoad = () => {
      fitToContent();
      const root = frame.contentDocument?.documentElement;
      if (!root) return;
      observer?.disconnect();
      observer = new ResizeObserver(fitToContent);
      observer.observe(root);
    };

    frame.addEventListener("load", onLoad);
    return () => {
      frame.removeEventListener("load", onLoad);
      observer?.disconnect();
    };
  }, [srcDoc]);

  return (
    <DashboardSection>
      <DashboardSection.Header
        icon={<EyeIcon weight="duotone" className="size-4" />}
        title={m.previewTitle}
        addOn={<ColorSchemeSegmentedControl value={colorScheme} onChange={setColorScheme} />}
      />
      <DashboardSection.Body className="!gap-0 !p-0">
        <iframe
          ref={frameRef}
          srcDoc={srcDoc}
          // The floor holds the card open whilst the first preview is still
          // being fetched. Everything above it comes from the email itself.
          className="block w-full min-h-32 border-0"
          title={m.previewTitle}
          sandbox="allow-same-origin"
        />
      </DashboardSection.Body>
    </DashboardSection>
  );
}
