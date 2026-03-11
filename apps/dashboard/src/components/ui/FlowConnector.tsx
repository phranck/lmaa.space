import { ArrowFatLinesDownIcon, ArrowFatLinesRightIcon } from "@phosphor-icons/react";

interface FlowConnectorProps {
  direction?: "vertical" | "horizontal";
  className?: string;
}

export function FlowConnector({ direction = "vertical", className }: FlowConnectorProps) {
  const isVertical = direction === "vertical";
  const Icon = isVertical ? ArrowFatLinesDownIcon : ArrowFatLinesRightIcon;

  return (
    <div
      className={`flex items-center justify-center ${
        isVertical ? "h-14 -my-px" : "w-14 -mx-px self-stretch"
      } ${className ?? ""}`}
    >
      <Icon
        weight="duotone"
        className={`${isVertical ? "w-5 h-5" : "w-5 h-5"} text-[var(--ds-text)]`}
      />
    </div>
  );
}
