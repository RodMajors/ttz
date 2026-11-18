import type { ImgHTMLAttributes } from "react";

type GameIconProps = Omit<ImgHTMLAttributes<HTMLImageElement>, "src"> & { src: string | null | undefined };

export function GameIcon({ src, alt = "", className, ...props }: GameIconProps) {
  if (!src) return null;
  return <img src={src} alt={alt} className={className} loading="lazy" decoding="async" {...props} />;
}
