// Wspólne warianty i przejścia animacji używane na stronach publicznych oraz w pulpicie

import type { Variants, Transition } from "motion/react";

const spring: Transition = { type: "spring", bounce: 0.28, duration: 0.85 };
const smooth: Transition = { duration: 0.55, ease: [0.16, 1, 0.3, 1] };
const fast: Transition = { duration: 0.3, ease: [0.16, 1, 0.3, 1] };
const micro: Transition = { duration: 0.18, ease: "easeOut" };

export const vp = {
  once: { once: true, margin: "-80px" } as const,
  eager: { once: true, margin: "-40px" } as const,
  hero: { once: true } as const,
} as const;

export const fadeUp: Variants = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: smooth },
};

export const fadeIn: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: fast },
};

export const fadeDown: Variants = {
  hidden: { opacity: 0, y: -16 },
  visible: { opacity: 1, y: 0, transition: smooth },
};

export const scaleIn: Variants = {
  hidden: { opacity: 0, scale: 0.96 },
  visible: { opacity: 1, scale: 1, transition: smooth },
};

export const blurUp: Variants = {
  hidden: { opacity: 0, filter: "blur(10px)", y: 14 },
  visible: { opacity: 1, filter: "blur(0px)", y: 0, transition: spring },
};

export const slideLeft: Variants = {
  hidden: { opacity: 0, x: -40 },
  visible: { opacity: 1, x: 0, transition: smooth },
};

export const slideRight: Variants = {
  hidden: { opacity: 0, x: 40 },
  visible: { opacity: 1, x: 0, transition: smooth },
};

export const staggerBase: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.08, delayChildren: 0.06 } },
};

export const staggerSlow: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.12, delayChildren: 0.1 } },
};

export const staggerFast: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.05, delayChildren: 0.03 } },
};

export const staggerHero: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.1, delayChildren: 0.06 } },
};

export const accordionAnimate = {
  initial: { height: 0, opacity: 0 },
  animate: {
    height: "auto",
    opacity: 1,
    transition: {
      height: { duration: 0.34, ease: [0.16, 1, 0.3, 1] },
      opacity: { duration: 0.2, delay: 0.08 },
    },
  },
  exit: {
    height: 0,
    opacity: 0,
    transition: {
      height: { duration: 0.24, ease: [0.4, 0, 0.2, 1] },
      opacity: { duration: 0.12 },
    },
  },
} as const;

export const hoverLift = {
  whileHover: { y: -2, transition: micro },
  whileTap: { scale: 0.98, transition: micro },
} as const;

export const hoverScale = {
  whileHover: { scale: 1.03, transition: micro },
  whileTap: { scale: 0.97, transition: micro },
} as const;

export const routeEnterEase = [0.22, 1, 0.36, 1] as const;

export const routeEnterTransition: Transition = {
  duration: 0.22,
  ease: routeEnterEase,
};
