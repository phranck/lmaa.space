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

/**
 * Cards stacked down the page, with one gap between them.
 *
 * @param props - Anything a `div` takes. A `className` is appended, so a
 *   caller can add the column span and the `min-w-0` it needs as a grid item.
 * @returns The stack.
 *
 * @remarks
 * Flex rather than a grid, and that is the whole reason this exists. A grid
 * that names no column has one implicit `auto` track, and the minimum of an
 * `auto` track is the max-content width of the card in it. A card wider than
 * the space available then keeps that width and stands outside a container
 * that has already shrunk, which is what put the sponsoring settings cards 445
 * pixels past their own column. Under flex the width is the cross axis and
 * follows the container.
 */
export function PageStack({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cx("flex flex-col gap-4", className)} {...props} />;
}

type PageSplitLayoutProps = HTMLAttributes<HTMLDivElement> & {
  columnsClassName?: string;
};

export function PageSplitLayout({ className, columnsClassName, ...props }: PageSplitLayoutProps) {
  return (
    <div
      className={cx(
        "grid grid-cols-1 gap-4",
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
