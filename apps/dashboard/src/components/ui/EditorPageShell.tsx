import type { ReactNode } from "react";

import { Card } from "@/components/ui/Card.tsx";
import { HeaderBackButton } from "@/components/ui/HeaderBackButton.tsx";
import { PageHeader } from "@/components/ui/PageHeader.tsx";
import { PageBody, PageLayout } from "@/components/ui/PageLayout.tsx";
import { Toolbar } from "@/components/ui/Toolbar.tsx";

function cx(...parts: Array<string | undefined>) {
  return parts.filter(Boolean).join(" ");
}

interface EditorPageShellProps {
  title: string;
  titleContent?: ReactNode;
  backLabel: string;
  onBack: () => void;
  headerContent?: ReactNode;
  children: ReactNode;
  toolbar?: ReactNode;
  bodyClassName?: string;
  cardClassName?: string;
  noCard?: boolean;
}

export function EditorPageShell({
  title,
  titleContent,
  backLabel,
  onBack,
  headerContent,
  children,
  toolbar,
  bodyClassName,
  cardClassName,
  noCard,
}: EditorPageShellProps) {
  return (
    <PageLayout>
      <PageHeader
        title={title}
        titleContent={titleContent}
        leading={<HeaderBackButton label={backLabel} onClick={onBack} />}
      >
        {headerContent}
      </PageHeader>

      <PageBody className={cx("min-h-0", bodyClassName)}>
        {noCard ? children : <Card className={cx("p-5 mb-3", cardClassName)}>{children}</Card>}
        {toolbar ? <Toolbar className="sticky -bottom-3 z-20 justify-end">{toolbar}</Toolbar> : null}
      </PageBody>
    </PageLayout>
  );
}
