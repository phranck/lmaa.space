import { useState } from "react";

const SIZE_CLASSES = {
  sm: "size-8 text-xs",
  md: "size-9 text-sm",
  lg: "size-12 text-base",
};

interface UserAvatarProps {
  username: string;
  avatarUrl?: string | null;
  size?: "sm" | "md" | "lg";
  className?: string;
}

/**
 * User avatar component with image fallback to initial letter badge.
 *
 * @param props - Username/avatar URL and sizing options.
 * @returns Avatar image or fallback circle.
 */
export function UserAvatar({ username, avatarUrl, size = "md", className = "" }: UserAvatarProps) {
  const [imgError, setImgError] = useState(false);
  const sizeClass = SIZE_CLASSES[size];

  if (avatarUrl && !imgError) {
    return (
      <img
        src={avatarUrl}
        alt={username}
        className={`${sizeClass} ${className} rounded-full shrink-0 object-cover`}
        onError={() => setImgError(true)}
      />
    );
  }

  return (
    <div
      className={`${sizeClass} ${className} rounded-full bg-[var(--color-primary)] text-white flex items-center justify-center font-semibold shrink-0`}
    >
      {username[0]?.toUpperCase()}
    </div>
  );
}
