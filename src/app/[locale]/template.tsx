"use client";

// Animuje wejście trasy przy każdej nawigacji: przygaszenie i podniesienie o 5 px

import { motion, useReducedMotion } from "motion/react";
import { usePathname } from "next/navigation";
import { routeEnterTransition } from "@/lib/animations";

export default function LocaleTemplate({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const reduceMotion = useReducedMotion();

  return (
    <motion.div
      key={pathname}
      className="w-full"
      initial={reduceMotion ? false : { opacity: 0, y: 5 }}
      animate={{ opacity: 1, y: 0 }}
      transition={reduceMotion ? { duration: 0 } : routeEnterTransition}
    >
      {children}
    </motion.div>
  );
}
