import { BankIcon } from "@phosphor-icons/react";
import { useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router";

import { ContentUnavailableView } from "@/components/ui/ContentUnavailableView.tsx";
import { DashboardButton } from "@/components/ui/DashboardButton.tsx";
import { PageHeader } from "@/components/ui/PageHeader.tsx";
import { PageBody, PageLayout } from "@/components/ui/PageLayout.tsx";
import { useI18n } from "@/context/I18nContext.tsx";

import { useCompleteBankAuthorization } from "./hooks/useBankConnection.ts";

/** Where the page goes once it has nothing left to do. */
const BANK_CONNECTION_PATH = "/bank-connection";

/**
 * Where the bank returns the account holder after they have identified
 * themselves.
 *
 * The address it registers with the provider is this one, so the return lands
 * on a page that is already signed in. What arrives in the address bar is
 * handed to the backend, which is the only place holding the key that can spend
 * it, and then removed from the address so a reload cannot present it again.
 *
 * @returns The page.
 */
export function BankConnectionCallbackPage() {
  const { messages } = useI18n();
  const text = messages.system.bankConnection;

  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const completeAuthorization = useCompleteBankAuthorization();

  // Read once, on the first render. Everything below then works from this copy,
  // including after the address has been cleared.
  const [handover] = useState(() => ({
    code: searchParams.get("code") ?? "",
    state: searchParams.get("state") ?? "",
  }));

  // The return is spendable exactly once, so the request is made exactly once.
  // Without this the development double-render would spend it and then report
  // the second attempt as a failure.
  const sent = useRef(false);

  useEffect(() => {
    if (sent.current) return;
    sent.current = true;

    setSearchParams({}, { replace: true });
    if (!handover.code || !handover.state) return;

    completeAuthorization.mutate(handover, {
      onSuccess: () => {
        void navigate(BANK_CONNECTION_PATH, { replace: true });
      },
    });
  }, [completeAuthorization, handover, navigate, setSearchParams]);

  const failed = completeAuthorization.isError || !handover.code || !handover.state;

  return (
    <PageLayout>
      <PageHeader title={text.title} />
      <PageBody>
        {failed ? (
          <div className="flex flex-col items-center gap-4">
            <ContentUnavailableView
              chromeless
              icon={<BankIcon weight="duotone" aria-hidden />}
              title={text.callbackFailedTitle}
              subtitle={text.callbackFailedHint}
            />
            <DashboardButton
              variant="primary"
              onClick={() => void navigate(BANK_CONNECTION_PATH, { replace: true })}
            >
              {text.callbackBack}
            </DashboardButton>
          </div>
        ) : (
          <div className="flex h-32 items-center justify-center text-sm text-[var(--ds-text-muted)]">
            {text.callbackPending}
          </div>
        )}
      </PageBody>
    </PageLayout>
  );
}
