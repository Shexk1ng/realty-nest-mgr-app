"use client";

// Przycisk aplikacji mapujący starsze nazwy wariantów i rozmiarów na przycisk z HeroUI

import * as React from "react";
import { Button as HeroButton } from "@heroui/react";
import { cn } from "@/lib/utils";

type LegacyVariant = "default" | "destructive" | "outline" | "secondary" | "ghost" | "link";
type LegacySize = "default" | "sm" | "lg" | "icon";

type HeroVariant = NonNullable<React.ComponentProps<typeof HeroButton>["variant"]>;
type HeroSize = NonNullable<React.ComponentProps<typeof HeroButton>["size"]>;

const VARIANT_MAP: Record<LegacyVariant, HeroVariant> = {
  default: "primary",
  destructive: "danger",
  outline: "outline",
  secondary: "secondary",
  ghost: "ghost",
  link: "ghost",
};

const SIZE_MAP: Record<LegacySize, HeroSize> = {
  default: "md",
  sm: "sm",
  lg: "lg",
  icon: "md",
};

export interface ButtonProps
  extends Omit<React.ComponentProps<typeof HeroButton>, "variant" | "size" | "onClick"> {
  variant?: LegacyVariant | HeroVariant;
  size?: LegacySize | HeroSize;
  onClick?: React.MouseEventHandler<HTMLButtonElement>;
  disabled?: boolean;
}

export function Button({
  className,
  variant = "default",
  size = "default",
  onClick,
  onPress,
  disabled,
  isDisabled,
  ...props
}: ButtonProps) {
  const heroVariant = (VARIANT_MAP[variant as LegacyVariant] ?? variant) as HeroVariant;
  const heroSize = (SIZE_MAP[size as LegacySize] ?? size) as HeroSize;

  return (
    <HeroButton
      variant={heroVariant}
      size={heroSize}
      isIconOnly={size === "icon" || props.isIconOnly}
      isDisabled={isDisabled ?? disabled}
      onPress={
        onPress ??
        (onClick
          ? (e) => onClick(e as unknown as React.MouseEvent<HTMLButtonElement>)
          : undefined)
      }
      className={cn(variant === "link" && "button--link-compat underline-offset-4", className)}
      {...props}
    />
  );
}

Button.displayName = "Button";

export { HeroButton };
