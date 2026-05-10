import {
  createContext,
  use,
  useCallback,
  useEffect,
  useEffectEvent,
  useId,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import type {
  ButtonHTMLAttributes,
  CSSProperties,
  HTMLAttributes,
  KeyboardEvent,
  MouseEvent,
  ReactNode,
  RefObject,
} from "react";
import { createPortal } from "react-dom";

import { cx } from "./classNames";

export interface MenuOrigin {
  x: number;
  y: number;
}

interface MenuPosition {
  left: number;
  minWidth?: number;
  top: number;
}

interface MenuContextValue {
  closeMenu: () => void;
  menuId: string;
}

const MenuContext = createContext<MenuContextValue | null>(null);

export interface MenuPrimitiveRenderState {
  closeMenu: () => void;
  menuId: string;
}

export interface MenuPrimitiveProps
  extends Omit<HTMLAttributes<HTMLDivElement>, "children"> {
  autoFocus?: boolean;
  children: ReactNode | ((state: MenuPrimitiveRenderState) => ReactNode);
  clampPadding?: number;
  labelledBy?: string;
  matchTriggerWidth?: boolean;
  menuId?: string;
  onOpenChange: (open: boolean) => void;
  open: boolean;
  origin?: MenuOrigin | null;
  placementOffset?: number;
  portal?: boolean;
  portalContainer?: HTMLElement;
  triggerRef?: RefObject<HTMLElement | null>;
}

export function MenuPrimitive({
  autoFocus = true,
  children,
  clampPadding = 8,
  className,
  labelledBy,
  matchTriggerWidth = false,
  menuId,
  onOpenChange,
  open,
  origin = null,
  placementOffset = 6,
  portal = true,
  portalContainer,
  style,
  triggerRef,
  ...menuProps
}: MenuPrimitiveProps) {
  const generatedId = useId();
  const resolvedMenuId = menuId ?? `${generatedId}-menu`;
  const menuRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState<MenuPosition | null>(null);

  const closeMenu = useCallback(() => {
    onOpenChange(false);
    triggerRef?.current?.focus();
  }, [onOpenChange, triggerRef]);
  const closeFromDocumentEvent = useEffectEvent((restoreFocus: boolean) => {
    onOpenChange(false);
    if (restoreFocus) {
      triggerRef?.current?.focus();
    }
  });

  useLayoutEffect(() => {
    if (!open || (!origin && !triggerRef?.current)) {
      setPosition(null);
      return;
    }

    const updatePosition = () => {
      const menu = menuRef.current;
      if (!menu) {
        return;
      }

      const triggerRect = triggerRef?.current?.getBoundingClientRect();
      const baseLeft = origin?.x ?? triggerRect?.left ?? 0;
      const baseTop = origin?.y ?? (triggerRect ? triggerRect.bottom + placementOffset : 0);
      const menuRect = menu.getBoundingClientRect();
      const maxLeft = window.innerWidth - menuRect.width - clampPadding;
      const maxTop = window.innerHeight - menuRect.height - clampPadding;

      setPosition({
        left: Math.max(clampPadding, Math.min(baseLeft, maxLeft)),
        minWidth: matchTriggerWidth ? triggerRect?.width : undefined,
        top: Math.max(clampPadding, Math.min(baseTop, maxTop)),
      });
    };

    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);

    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [
    clampPadding,
    matchTriggerWidth,
    open,
    origin,
    placementOffset,
    triggerRef,
  ]);

  useEffect(() => {
    if (!open) {
      return;
    }

    const handleMouseDown = (event: globalThis.MouseEvent) => {
      const target = event.target;
      if (!(target instanceof Node)) {
        return;
      }
      if (triggerRef?.current?.contains(target)) {
        return;
      }
      if (menuRef.current?.contains(target)) {
        return;
      }
      closeFromDocumentEvent(false);
    };

    document.addEventListener("mousedown", handleMouseDown);
    return () => document.removeEventListener("mousedown", handleMouseDown);
  }, [open, triggerRef]);

  useEffect(() => {
    if (!open) {
      return;
    }

    const focusFirstItem = () => getEnabledMenuItems(menuRef.current)[0]?.focus();

    if (autoFocus) {
      window.requestAnimationFrame(focusFirstItem);
    }

    const focusItem = (direction: 1 | -1) => {
      const items = getEnabledMenuItems(menuRef.current);
      if (items.length === 0) {
        return;
      }

      const currentIndex = items.indexOf(document.activeElement as HTMLButtonElement);
      const nextIndex =
        currentIndex >= 0
          ? (currentIndex + direction + items.length) % items.length
          : direction > 0
            ? 0
            : items.length - 1;
      items[nextIndex]?.focus();
    };

    const handleKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.defaultPrevented) {
        return;
      }

      if (event.key === "Escape") {
        event.preventDefault();
        event.stopPropagation();
        closeFromDocumentEvent(true);
        return;
      }

      const target = event.target;
      const targetIsInside =
        target instanceof Node &&
        (menuRef.current?.contains(target) ||
          triggerRef?.current?.contains(target));

      if (!targetIsInside) {
        return;
      }

      switch (event.key) {
        case "ArrowDown":
          event.preventDefault();
          focusItem(1);
          break;
        case "ArrowUp":
          event.preventDefault();
          focusItem(-1);
          break;
        case "Home": {
          event.preventDefault();
          getEnabledMenuItems(menuRef.current)[0]?.focus();
          break;
        }
        case "End": {
          event.preventDefault();
          const items = getEnabledMenuItems(menuRef.current);
          items[items.length - 1]?.focus();
          break;
        }
        case "Tab":
          closeFromDocumentEvent(true);
          break;
        default:
          break;
      }
    };

    document.addEventListener("keydown", handleKeyDown, true);
    return () => document.removeEventListener("keydown", handleKeyDown, true);
  }, [autoFocus, open, triggerRef]);

  if (!open) {
    return null;
  }

  const renderState: MenuPrimitiveRenderState = {
    closeMenu,
    menuId: resolvedMenuId,
  };
  const contextValue: MenuContextValue = {
    closeMenu,
    menuId: resolvedMenuId,
  };
  const positionedStyle: CSSProperties | undefined =
    position || origin || triggerRef?.current
      ? {
          left: position?.left ?? origin?.x,
          minWidth: position?.minWidth,
          position: portal ? "fixed" : "absolute",
          top: position?.top ?? origin?.y,
          visibility: position ? undefined : "hidden",
          ...style,
        }
      : style;
  const content =
    typeof children === "function" ? children(renderState) : children;
  const menu = (
    <MenuContext.Provider value={contextValue}>
      <div
        aria-labelledby={labelledBy}
        className={cx(
          "min-w-48 rounded-control border border-[var(--ds-border)] bg-[var(--ds-bg-elevated,var(--ds-surface))] py-1 text-sm shadow-[var(--ds-overlay-shadow)]",
          "z-[var(--ds-overlay-z-menu)]",
          className,
        )}
        id={resolvedMenuId}
        ref={menuRef}
        role="menu"
        style={positionedStyle}
        {...menuProps}
      >
        {content}
      </div>
    </MenuContext.Provider>
  );
  const portalTarget =
    portalContainer ??
    (typeof document !== "undefined" ? document.body : undefined);

  return portal && portalTarget ? createPortal(menu, portalTarget) : menu;
}

export type MenuItemPrimitiveSize = "default" | "compact";
export type MenuItemPrimitiveVariant = "default" | "danger";

export interface MenuItemPrimitiveProps
  extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "onSelect"> {
  addOn?: ReactNode;
  closeOnSelect?: boolean;
  leadingIcon?: ReactNode;
  onSelect?: () => void;
  size?: MenuItemPrimitiveSize;
  variant?: MenuItemPrimitiveVariant;
}

export function MenuItemPrimitive({
  addOn,
  children,
  className,
  closeOnSelect = true,
  disabled,
  leadingIcon,
  onClick,
  onKeyDown,
  onMouseEnter,
  onSelect,
  size = "default",
  type = "button",
  variant = "default",
  ...buttonProps
}: MenuItemPrimitiveProps) {
  const context = use(MenuContext);

  const selectItem = useCallback(() => {
    onSelect?.();
    if (closeOnSelect) {
      context?.closeMenu();
    }
  }, [closeOnSelect, context, onSelect]);

  const selectMenuItemWithClick = (event: MouseEvent<HTMLButtonElement>) => {
    onClick?.(event);
    if (event.defaultPrevented || disabled) {
      return;
    }
    selectItem();
  };

  const selectMenuItemWithKeyboard = (event: KeyboardEvent<HTMLButtonElement>) => {
    onKeyDown?.(event);
    if (event.defaultPrevented || disabled) {
      return;
    }
    if (event.key !== "Enter" && event.key !== " ") {
      return;
    }
    event.preventDefault();
    selectItem();
  };

  const focusMenuItemOnMouseEnter = (event: MouseEvent<HTMLButtonElement>) => {
    onMouseEnter?.(event);
    if (event.defaultPrevented || disabled) {
      return;
    }
    event.currentTarget.focus();
  };

  return (
    <button
      {...buttonProps}
      className={cx(
        "flex w-full items-center gap-2 px-3 text-left text-sm transition-colors",
        "focus:bg-[var(--ds-control-hover-bg)] focus:outline-none hover:bg-[var(--ds-control-hover-bg)]",
        "disabled:pointer-events-none disabled:opacity-[var(--ds-control-disabled-opacity)]",
        size === "compact" ? "h-7" : "h-[var(--ds-control-h-menu-item)]",
        variant === "danger"
          ? "text-[var(--ds-danger-text)]"
          : "text-[var(--ds-text)]",
        className,
      )}
      data-menu-item="true"
      disabled={disabled}
      onClick={selectMenuItemWithClick}
      onKeyDown={selectMenuItemWithKeyboard}
      onMouseEnter={focusMenuItemOnMouseEnter}
      role="menuitem"
      tabIndex={-1}
      type={type}
    >
      {leadingIcon && (
        <span className="flex shrink-0 items-center text-[var(--ds-text-muted)]">
          {leadingIcon}
        </span>
      )}
      <span className="min-w-0 flex-1 truncate">{children}</span>
      {addOn && (
        <span className="flex shrink-0 items-center text-[var(--ds-text-muted)]">
          {addOn}
        </span>
      )}
    </button>
  );
}

function getEnabledMenuItems(menu: HTMLElement | null) {
  if (!menu) {
    return [];
  }

  return Array.from(
    menu.querySelectorAll<HTMLButtonElement>("[data-menu-item='true']:not(:disabled)"),
  );
}
