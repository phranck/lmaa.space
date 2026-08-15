/**
 * One entry of a navigation whilst it is being edited.
 */
export interface NavItemState {
  id: number;
  pageSlug: string | null;
  pageTitle: string | null;
  url: string | null;
  target: "_self" | "_blank";
  label: string;
}

/**
 * Everything one navigation column holds whilst it is being edited.
 */
export interface NavColumnState {
  items: NavItemState[];
  dirty: boolean;
  addType: "page" | "url" | "form";
  addPageSlug: string;
  addUrl: string;
  addLabel: string;
  addTarget: "_self" | "_blank";
}

/**
 * Applies a change to a navigation column.
 *
 * @param prev - The state as it stands.
 * @param action - The fields to change.
 * @returns The new state, or the previous one where nothing actually changed.
 *
 * @remarks
 * Returning `prev` unchanged is what keeps this page from looping. A reducer
 * that copies on every action produces a new object each time, React renders
 * again for it, and an effect that writes the same value on every render then
 * never settles. That is how this page reached "maximum update depth
 * exceeded".
 */
export function navColumnReducer(
  prev: NavColumnState,
  action: Partial<NavColumnState>,
): NavColumnState {
  const changed = Object.entries(action).some(
    ([key, value]) => prev[key as keyof NavColumnState] !== value,
  );
  return changed ? { ...prev, ...action } : prev;
}

/**
 * Stands in for a navigation that has not been loaded yet.
 *
 * @remarks
 * One array for every render, because an inline `[]` is a new one each time and
 * anything that depends on it then sees a change that never happened.
 */
export const NO_NAV_ITEMS: NavItemState[] = [];
