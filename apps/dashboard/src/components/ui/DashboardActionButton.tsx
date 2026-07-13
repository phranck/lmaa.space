import type { IconProps } from "@phosphor-icons/react";
import {
  ArrowCounterClockwiseIcon,
  ArrowsClockwiseIcon,
  CheckCircleIcon,
  CopyIcon,
  DownloadSimpleIcon,
  FloppyDiskIcon,
  PaperPlaneTiltIcon,
  PauseCircleIcon,
  PencilSimpleIcon,
  PlusIcon,
  SkipForwardIcon,
  TrashIcon,
  UploadSimpleIcon,
  XCircleIcon,
  XIcon,
} from "@phosphor-icons/react";
import { useCallback, useRef, type ComponentType, type ReactNode, type Ref } from "react";

import { useI18n } from "@/context/I18nContext.tsx";
import type { DashboardMessages } from "@/i18n/messages.ts";
import { useKeyboardSave } from "@/lib/hooks/useKeyboardSave.ts";

import {
  DashboardButton,
  DashboardIconButton,
  type DashboardButtonProps,
  type DashboardButtonSize,
  type DashboardButtonVariant,
} from "./DashboardButton.tsx";

export type DashboardActionStatus = "idle" | "busy";
export type DashboardActionColorRole =
  | "neutral"
  | "primary"
  | "success"
  | "warning"
  | "danger"
  | "ghost";
export type DashboardActionAriaBehavior = "visible-label" | "icon-only-label";
export type DashboardActionLabelKey =
  `common.${Extract<keyof DashboardMessages["common"], string>}`;
export type DashboardActionIcon = ComponentType<IconProps>;

export interface DashboardActionDefinition {
  ariaBehavior: DashboardActionAriaBehavior;
  colorRole: DashboardActionColorRole;
  icon: DashboardActionIcon;
  labelKey: DashboardActionLabelKey;
  size: DashboardButtonSize;
  statusLabelKeys?: Partial<
    Record<Exclude<DashboardActionStatus, "idle">, DashboardActionLabelKey>
  >;
}

const DASHBOARD_ACTIONS = {
  save: {
    ariaBehavior: "visible-label",
    colorRole: "primary",
    icon: FloppyDiskIcon,
    labelKey: "common.save",
    size: "action",
    statusLabelKeys: { busy: "common.saving" },
  },
  sendTest: {
    ariaBehavior: "visible-label",
    colorRole: "neutral",
    icon: PaperPlaneTiltIcon,
    labelKey: "common.sendTestEmail",
    size: "action",
    statusLabelKeys: { busy: "common.sending" },
  },
  delete: {
    ariaBehavior: "visible-label",
    colorRole: "danger",
    icon: TrashIcon,
    labelKey: "common.delete",
    size: "action",
  },
  remove: {
    ariaBehavior: "visible-label",
    colorRole: "danger",
    icon: XCircleIcon,
    labelKey: "common.remove",
    size: "action",
  },
  edit: {
    ariaBehavior: "visible-label",
    colorRole: "neutral",
    icon: PencilSimpleIcon,
    labelKey: "common.edit",
    size: "action",
  },
  create: {
    ariaBehavior: "visible-label",
    colorRole: "primary",
    icon: PlusIcon,
    labelKey: "common.create",
    size: "action",
  },
  import: {
    ariaBehavior: "visible-label",
    colorRole: "success",
    icon: DownloadSimpleIcon,
    labelKey: "common.import",
    size: "action",
  },
  export: {
    ariaBehavior: "visible-label",
    colorRole: "primary",
    icon: UploadSimpleIcon,
    labelKey: "common.export",
    size: "action",
  },
  copy: {
    ariaBehavior: "visible-label",
    colorRole: "neutral",
    icon: CopyIcon,
    labelKey: "common.copy",
    size: "action",
  },
  cancel: {
    ariaBehavior: "visible-label",
    colorRole: "neutral",
    icon: XIcon,
    labelKey: "common.cancel",
    size: "action",
  },
  close: {
    ariaBehavior: "icon-only-label",
    colorRole: "ghost",
    icon: XIcon,
    labelKey: "common.close",
    size: "action",
  },
  reject: {
    ariaBehavior: "visible-label",
    colorRole: "danger",
    icon: XCircleIcon,
    labelKey: "common.reject",
    size: "action",
  },
  approve: {
    ariaBehavior: "visible-label",
    colorRole: "success",
    icon: CheckCircleIcon,
    labelKey: "common.approve",
    size: "action",
  },
  restore: {
    ariaBehavior: "visible-label",
    colorRole: "success",
    icon: ArrowCounterClockwiseIcon,
    labelKey: "common.restore",
    size: "action",
  },
  hold: {
    ariaBehavior: "visible-label",
    colorRole: "warning",
    icon: PauseCircleIcon,
    labelKey: "common.putOnHold",
    size: "action",
  },
  overwrite: {
    ariaBehavior: "visible-label",
    colorRole: "warning",
    icon: ArrowsClockwiseIcon,
    labelKey: "common.overwrite",
    size: "action",
  },
  skip: {
    ariaBehavior: "visible-label",
    colorRole: "neutral",
    icon: SkipForwardIcon,
    labelKey: "common.skip",
    size: "action",
  },
} as const satisfies Record<string, DashboardActionDefinition>;

export type DashboardActionId = keyof typeof DASHBOARD_ACTIONS;

export interface DashboardActionButtonProps extends Omit<
  DashboardButtonProps,
  "children" | "leadingIcon" | "size" | "variant"
> {
  action: DashboardActionId;
  busy?: boolean;
  children?: ReactNode;
  icon?: ReactNode | false;
  iconOnly?: boolean;
  keyboardShortcut?: boolean;
  label?: string;
  size?: DashboardButtonSize;
  status?: DashboardActionStatus;
  variant?: DashboardButtonVariant;
}

type SpecificDashboardActionButtonProps = Omit<DashboardActionButtonProps, "action">;
type SaveActionButtonProps = Omit<SpecificDashboardActionButtonProps, "icon">;

function assignForwardedButtonRef(
  ref: Ref<HTMLButtonElement> | undefined,
  value: HTMLButtonElement | null,
) {
  if (typeof ref === "function") {
    ref(value);
    return;
  }
  if (ref) ref.current = value;
}

export function DashboardActionButton({
  action,
  busy = false,
  children,
  icon,
  iconOnly,
  keyboardShortcut: _keyboardShortcut,
  label,
  ref,
  size,
  status = "idle",
  variant,
  ...buttonProps
}: DashboardActionButtonProps) {
  const { messages } = useI18n();
  const definition = DASHBOARD_ACTIONS[action];
  const resolvedStatus = busy ? "busy" : status;
  const resolvedActionLabel = getDashboardActionLabel(
    messages,
    getActionLabelKey(definition, resolvedStatus),
  );
  const resolvedLabel = label ?? resolvedActionLabel;
  const shouldRenderIconOnly = iconOnly ?? definition.ariaBehavior === "icon-only-label";
  const renderedIcon = renderActionIcon(definition, icon);
  const { "aria-busy": ariaBusy, "aria-label": ariaLabel, ...restButtonProps } = buttonProps;

  if (shouldRenderIconOnly) {
    return (
      <DashboardIconButton
        aria-busy={ariaBusy ?? (busy || undefined)}
        aria-label={ariaLabel ?? resolvedLabel}
        ref={ref}
        size={size ?? definition.size}
        variant={variant ?? definition.colorRole}
        {...restButtonProps}
      >
        {renderedIcon}
      </DashboardIconButton>
    );
  }

  return (
    <DashboardButton
      aria-busy={ariaBusy ?? (busy || undefined)}
      aria-label={ariaLabel}
      ref={ref}
      leadingIcon={renderedIcon}
      size={size ?? definition.size}
      variant={variant ?? definition.colorRole}
      {...restButtonProps}
    >
      {children ?? resolvedLabel}
    </DashboardButton>
  );
}

export function SaveActionButton({
  keyboardShortcut = true,
  ref,
  ...props
}: SaveActionButtonProps) {
  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const mergedRef = useCallback(
    (value: HTMLButtonElement | null) => {
      buttonRef.current = value;
      assignForwardedButtonRef(ref, value);
    },
    [ref],
  );
  const shortcutEnabled =
    keyboardShortcut !== false && !props.disabled && !props.busy && props.status !== "busy";

  useKeyboardSave(() => {
    buttonRef.current?.click();
  }, shortcutEnabled);

  return <DashboardActionButton ref={mergedRef} action="save" {...props} />;
}

export function DeleteActionButton(props: SpecificDashboardActionButtonProps) {
  return <DashboardActionButton action="delete" {...props} />;
}

export function RemoveActionButton(props: SpecificDashboardActionButtonProps) {
  return <DashboardActionButton action="remove" {...props} />;
}

export function EditActionButton(props: SpecificDashboardActionButtonProps) {
  return <DashboardActionButton action="edit" {...props} />;
}

export function CreateActionButton(props: SpecificDashboardActionButtonProps) {
  return <DashboardActionButton action="create" {...props} />;
}

export function ImportActionButton(props: SpecificDashboardActionButtonProps) {
  return <DashboardActionButton action="import" {...props} />;
}

export function ExportActionButton(props: SpecificDashboardActionButtonProps) {
  return <DashboardActionButton action="export" {...props} />;
}

export function CopyActionButton(props: SpecificDashboardActionButtonProps) {
  return <DashboardActionButton action="copy" {...props} />;
}

export function CancelActionButton(props: SpecificDashboardActionButtonProps) {
  return <DashboardActionButton action="cancel" {...props} />;
}

export function CloseActionButton(props: SpecificDashboardActionButtonProps) {
  return <DashboardActionButton action="close" {...props} />;
}

export function RejectActionButton(props: SpecificDashboardActionButtonProps) {
  return <DashboardActionButton action="reject" {...props} />;
}

export function ApproveActionButton(props: SpecificDashboardActionButtonProps) {
  return <DashboardActionButton action="approve" {...props} />;
}

export function OverwriteActionButton(props: SpecificDashboardActionButtonProps) {
  return <DashboardActionButton action="overwrite" {...props} />;
}

export function SkipActionButton(props: SpecificDashboardActionButtonProps) {
  return <DashboardActionButton action="skip" {...props} />;
}

function getActionLabelKey(definition: DashboardActionDefinition, status: DashboardActionStatus) {
  if (status === "busy" && definition.statusLabelKeys?.busy) {
    return definition.statusLabelKeys.busy;
  }

  return definition.labelKey;
}

function getDashboardActionLabel(messages: DashboardMessages, labelKey: DashboardActionLabelKey) {
  const commonKey = labelKey.slice("common.".length) as Extract<
    keyof DashboardMessages["common"],
    string
  >;
  return messages.common[commonKey];
}

function renderActionIcon(
  definition: DashboardActionDefinition,
  icon: ReactNode | false | undefined,
) {
  if (icon === false) {
    return null;
  }
  if (icon !== undefined) {
    return icon;
  }

  const Icon = definition.icon;
  return <Icon className="size-3.5" weight="duotone" />;
}
