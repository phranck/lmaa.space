// @vitest-environment jsdom
import { render } from "@testing-library/react";
import { useEffect, useRef } from "react";
import { describe, expect, it } from "vitest";

import { Card } from "@/components/ui/Card.tsx";

/**
 * Counts how often it is mounted, so a test can tell a re-render from a
 * remount.
 */
function MountCounter({ onMount }: { onMount: () => void }) {
  const reported = useRef(false);
  useEffect(() => {
    if (reported.current) return;
    reported.current = true;
    onMount();
  }, [onMount]);
  return <span data-testid="child" />;
}

describe("Card", () => {
  it("keeps its element and its children when transparent is switched", () => {
    let mounts = 0;
    const countMount = () => {
      mounts += 1;
    };

    const { container, rerender, getByTestId } = render(
      <Card transparent={false} className="p-3">
        <MountCounter onMount={countMount} />
      </Card>,
    );

    const cardBefore = container.firstElementChild;
    const childBefore = getByTestId("child");
    expect(mounts).toBe(1);

    rerender(
      <Card transparent={true} className="p-3">
        <MountCounter onMount={countMount} />
      </Card>,
    );

    // The same DOM nodes survive the switch. A container that swapped its
    // element type here would hand React a different type in the same slot,
    // and React would throw the subtree away and build it again. Anything
    // holding state inside, such as a routed page, would be back at its
    // initial state, and a page that drives `transparent` from that state
    // would then switch it back, over and over.
    expect(container.firstElementChild).toBe(cardBefore);
    expect(getByTestId("child")).toBe(childBefore);
    expect(mounts).toBe(1);
  });

  it("drops the surface colour when transparent and keeps it otherwise", () => {
    const { container, rerender } = render(<Card transparent={false} />);
    expect(container.firstElementChild?.className).toContain("var(--ds-card-bg");

    rerender(<Card transparent={true} />);
    expect(container.firstElementChild?.className).not.toContain("var(--ds-card-bg");
    expect(container.firstElementChild?.className).toContain("rounded-card");
  });
});
