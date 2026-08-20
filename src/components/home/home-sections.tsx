"use client";

// Sekcja strony głównej prezentująca stos technologiczny aplikacji

import {
  SiApollographql,
  SiAuth0,
  SiCloudinary,
  SiGooglegemini,
  SiMongodb,
  SiNextdotjs,
  SiNodedotjs,
  SiReact,
  SiTailwindcss,
  SiTypescript,
} from "react-icons/si";
import { motion, useReducedMotion, type Variants } from "motion/react";
import { Card } from "@heroui/react";

const STACK = [
  { name: "Next.js 16", Icon: SiNextdotjs, color: "#000000", darkColor: "#ffffff", href: "https://nextjs.org" },
  { name: "React 19", Icon: SiReact, color: "#149ECA", href: "https://react.dev" },
  { name: "TypeScript", Icon: SiTypescript, color: "#3178C6", href: "https://www.typescriptlang.org" },
  { name: "Apollo GraphQL", Icon: SiApollographql, color: "#311C87", darkColor: "#A78BFA", href: "https://www.apollographql.com" },
  { name: "MongoDB", Icon: SiMongodb, color: "#47A248", href: "https://www.mongodb.com" },
  { name: "Node.js", Icon: SiNodedotjs, color: "#339933", href: "https://nodejs.org" },
  { name: "Gemini", Icon: SiGooglegemini, color: "#8E75B2", href: "https://ai.google.dev" },
  { name: "Cloudinary", Icon: SiCloudinary, color: "#3448C5", darkColor: "#7C8CF8", href: "https://cloudinary.com" },
  { name: "Tailwind CSS", Icon: SiTailwindcss, color: "#38BDF8", href: "https://tailwindcss.com" },
  { name: "Auth.js", Icon: SiAuth0, color: "#EB5424", href: "https://authjs.dev" },
];

const grid: Variants = {
  hidden: {},
  shown: { transition: { staggerChildren: 0.05 } },
};

const tile: Variants = {
  hidden: { y: 22, opacity: 0, scale: 0.96 },
  shown: {
    y: 0,
    opacity: 1,
    scale: 1,
    transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] },
  },
};

const head: Variants = {
  hidden: { y: 20, opacity: 0 },
  shown: { y: 0, opacity: 1, transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] } },
};

export function HomeTechnologies() {
  const reduce = useReducedMotion();

  return (
    <section id="technologie" className="relative z-10 border-b border-border/50 bg-bg-2">
      <div className="mx-auto w-full max-w-6xl px-5 py-20 sm:px-8 sm:py-24">
        <motion.div
          className="mx-auto max-w-2xl text-center"
          variants={head}
          initial="hidden"
          whileInView="shown"
          viewport={{ once: true, margin: "-80px" }}
        >
          <h2 className="font-display text-3xl font-semibold leading-tight tracking-tight text-foreground sm:text-4xl">
            Niezawodny fundament technologiczny
          </h2>
          <p className="mt-4 text-base leading-relaxed text-muted-foreground">
            Architektura oparta na renderowaniu serwerowym (SSR), spójnej warstwie API
            i bezpiecznych protokołach autoryzacji.
          </p>
        </motion.div>

        <motion.ul
          className="mt-12 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5"
          variants={grid}
          initial="hidden"
          whileInView="shown"
          viewport={{ once: true, margin: "-60px" }}
        >
          {STACK.map(({ name, Icon, color, darkColor, href }) => (
            <motion.li key={name} variants={tile}>
              <motion.a
                href={href}
                target="_blank"
                rel="noreferrer noopener"
                className="block h-full rounded-2xl focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                whileHover={reduce ? undefined : { y: -6 }}
                whileTap={{ y: -2 }}
                transition={{ type: "spring", stiffness: 380, damping: 24 }}
              >
                <Card
                  variant="secondary"
                  className="group h-full transition-shadow duration-300 hover:shadow-[0_18px_40px_-18px_rgba(0,0,0,0.45)]"
                >
                  <Card.Content className="flex flex-col items-center justify-center py-7 text-center">
                    <span
                      className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-muted transition-transform duration-300 group-hover:scale-110"
                      aria-hidden
                    >
                      <Icon
                        className="h-6 w-6 [--brand:var(--brand-light)] dark:[--brand:var(--brand-dark)]"
                        style={
                          {
                            color: "var(--brand)",
                            "--brand-light": color,
                            "--brand-dark": darkColor ?? color,
                          } as React.CSSProperties
                        }
                      />
                    </span>
                    <span className="block text-sm font-medium text-foreground">{name}</span>
                  </Card.Content>
                </Card>
              </motion.a>
            </motion.li>
          ))}
        </motion.ul>
      </div>
    </section>
  );
}
