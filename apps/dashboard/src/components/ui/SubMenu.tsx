import type { ReactNode } from "react";

import {
  MenuItemPrimitive,
  MenuPrimitive,
  type MenuItemPrimitiveProps,
  type MenuPrimitiveProps,
} from "@lmaa/ui/menu-primitives";

type SubMenuRootProps = MenuPrimitiveProps;

type SubMenuActionItemProps = {
  icon?: ReactNode;
} & Omit<MenuItemPrimitiveProps, "leadingIcon" | "size">;

interface SubMenuSeparatorItemProps {
  className?: string;
  separator: true;
}

type SubMenuItemProps = SubMenuActionItemProps | SubMenuSeparatorItemProps;

function SubMenuRoot({ children, className, ...menuProps }: SubMenuRootProps) {
  return (
    <MenuPrimitive
      {...menuProps}
      className={cx(
        "min-w-36 overflow-hidden rounded-control border border-[var(--ds-border)] bg-[var(--ds-surface)] p-1 text-xs text-[var(--ds-text)] shadow-xl",
        className,
      )}
    >
      {children}
    </MenuPrimitive>
  );
}

function SubMenuItem(props: SubMenuItemProps) {
  if (isSeparatorItem(props)) {
    return <hr className={cx("my-1 h-px border-0 bg-[var(--ds-border)]", props.className)} />;
  }

  const { children, className, icon, variant, ...itemProps } = props;

  return (
    <MenuItemPrimitive
      {...itemProps}
      className={cx(
        "h-auto rounded px-2 py-1.5 text-left text-xs transition-none hover:bg-[var(--ds-surface-hover)] focus:bg-[var(--ds-surface-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ds-focus-ring)]",
        className,
      )}
      leadingIcon={icon ?? <span aria-hidden="true" className="size-4" />}
      size="compact"
      variant={variant}
    >
      {children}
    </MenuItemPrimitive>
  );
}

export const SubMenu = Object.assign(SubMenuRoot, {
  Item: SubMenuItem,
});

function isSeparatorItem(props: SubMenuItemProps): props is SubMenuSeparatorItemProps {
  return "separator" in props && props.separator;
}

function cx(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ");
}
