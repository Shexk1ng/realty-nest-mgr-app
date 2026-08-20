"use client";

// Awatar użytkownika ze zdjęciem lub inicjałami na gradiencie wyliczonym z nazwy

import { Avatar as HeroAvatar } from "@heroui/react";
import { avatarGradient, initials } from "@/lib/avatar";

export function Avatar({
  src,
  name,
  size = 40,
  className,
}: {
  src?: string | null;
  name: string;
  size?: number;
  className?: string;
}) {
  return (
    <HeroAvatar className={className} style={{ width: size, height: size, flexShrink: 0 }}>
      {src ? <HeroAvatar.Image src={src} alt={name} /> : null}
      <HeroAvatar.Fallback
        aria-label={name}
        style={{
          background: avatarGradient(name),
          color: "#fff",
          fontWeight: 600,
          fontSize: Math.round(size * 0.38),
          lineHeight: 1,
        }}
      >
        {initials(name)}
      </HeroAvatar.Fallback>
    </HeroAvatar>
  );
}
