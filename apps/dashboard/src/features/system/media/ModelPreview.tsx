interface ModelPreviewProps {
  alt: string;
  className?: string;
  reveal?: "auto";
  src: string;
}

export function ModelPreview({ alt, className }: ModelPreviewProps) {
  return (
    <div className={className} aria-label={alt} role="img">
      {alt}
    </div>
  );
}
