import { KeyboardSensor, PointerSensor, useSensor, useSensors } from "@dnd-kit/core";
import { sortableKeyboardCoordinates } from "@dnd-kit/sortable";

interface DashboardSortableSensorsOptions {
  activationDistance?: number;
}

export function useDashboardSortableSensors({
  activationDistance,
}: DashboardSortableSensorsOptions = {}) {
  const pointerOptions =
    activationDistance === undefined
      ? undefined
      : { activationConstraint: { distance: activationDistance } };

  return useSensors(
    useSensor(PointerSensor, pointerOptions),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );
}
