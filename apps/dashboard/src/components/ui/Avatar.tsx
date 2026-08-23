import { useState } from "react";

const SIZE_CLASSES = {
  sm: "size-8 text-xs",
  md: "size-9 text-sm",
  lg: "size-12 text-base",
};

interface AvatarProps {
  /** The name the initial is taken from, and the picture's alternative text. */
  name: string;
  /** The picture, where there is one. */
  imageUrl?: string | null;
  size?: "sm" | "md" | "lg";
  className?: string;
}

/**
 * A round picture of somebody, in a list or beside a name.
 *
 * Falls back to the first letter of the name, both when no picture was given
 * and when the one that was given fails to load. The second case matters here
 * because such a picture often sits on somebody else's server.
 *
 * @param props - The name, the picture and how large to draw it.
 * @returns The picture, or a circle carrying the initial.
 */
export function Avatar({ name, imageUrl, size = "md", className = "" }: AvatarProps) {
  const [imageFailed, setImageFailed] = useState(false);
  const sizeClass = SIZE_CLASSES[size];

  if (imageUrl && !imageFailed) {
    return (
      <img
        src={imageUrl}
        alt={name}
        className={`${sizeClass} ${className} rounded-full shrink-0 object-cover`}
        onError={() => setImageFailed(true)}
      />
    );
  }

  return (
    <div
      className={`${sizeClass} ${className} rounded-full bg-[var(--color-primary)] text-white flex items-center justify-center font-semibold shrink-0`}
    >
      {name.trim()[0]?.toUpperCase()}
    </div>
  );
}
