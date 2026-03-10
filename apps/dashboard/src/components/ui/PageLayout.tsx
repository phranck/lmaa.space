import type { HTMLAttributes } from "react";

function cx(...parts: Array<string | undefined>) {
  return parts.filter(Boolean).join(" ");
}

export function PageLayout({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cx("flex flex-1 min-h-0 flex-col", className)} {...props} />;
}

export function PageBody({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cx("flex flex-1 min-h-0 flex-col", className)} {...props} />;
}

type PageSplitLayoutProps = HTMLAttributes<HTMLDivElement> & {
  columnsClassName?: string;
};

export function PageSplitLayout({
  className,
  columnsClassName,
  ...props
}: PageSplitLayoutProps) {
  return (
    <div
      className={cx(
        "grid flex-1 min-h-0 grid-cols-1 gap-4",
        columnsClassName ?? "xl:grid-cols-[minmax(0,1fr)_22rem]",
        className,
      )}
      {...props}
    />
  );
}

export function PageSplitMain({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cx("flex flex-1 min-h-0 flex-col", className)} {...props} />;
}

export function PageSplitAside({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cx("min-h-0", className)} {...props} />;
}
