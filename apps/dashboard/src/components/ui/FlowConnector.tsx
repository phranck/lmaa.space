import { SFArrowshapeDownFill, SFArrowshapeRightFill } from "sf-symbols-lib/monochrome";

interface FlowConnectorProps {
  direction?: "vertical" | "horizontal";
  className?: string;
}

export function FlowConnector({ direction = "vertical", className }: FlowConnectorProps) {
  const isVertical = direction === "vertical";
  const Icon = isVertical ? SFArrowshapeDownFill : SFArrowshapeRightFill;

  return (
    <div
      className={`flex items-center justify-center ${
        isVertical ? "h-14 -my-px" : "w-14 -mx-px self-stretch"
      } ${className ?? ""}`}
    >
      <Icon className="w-4 h-4 text-[var(--ds-color-neutral-400)]" />
    </div>
  );
}
