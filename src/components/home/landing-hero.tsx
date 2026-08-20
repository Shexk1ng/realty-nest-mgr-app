"use client";

// Sekcja powitalna strony głównej z hasłem, ikonami funkcji i przejściem do panelu

import Image from "next/image";
import {
  BarChart3,
  Bot,
  Building2,
  CalendarClock,
  FileSignature,
  GitBranch,
  KeyRound,
  MapPin,
  ShieldCheck,
  Sparkles,
  Users,
  Wallet,
} from "lucide-react";
import { motion, useReducedMotion, type Variants } from "motion/react";
import { Button } from "@heroui/react";
import { useI18n } from "@/i18n/i18n-context";

const GLYPHS = [
  { Icon: Building2, x: "6%", y: "16%", size: 42, delay: 0 },
  { Icon: KeyRound, x: "16%", y: "38%", size: 30, delay: 0.3 },
  { Icon: MapPin, x: "9%", y: "62%", size: 34, delay: 0.6 },
  { Icon: FileSignature, x: "19%", y: "82%", size: 28, delay: 0.9 },
  { Icon: Users, x: "4%", y: "44%", size: 26, delay: 1.2 },
  { Icon: ShieldCheck, x: "90%", y: "20%", size: 40, delay: 0.2 },
  { Icon: Bot, x: "82%", y: "42%", size: 32, delay: 0.5 },
  { Icon: CalendarClock, x: "92%", y: "64%", size: 28, delay: 0.8 },
  { Icon: BarChart3, x: "78%", y: "80%", size: 34, delay: 1.1 },
  { Icon: Wallet, x: "88%", y: "86%", size: 26, delay: 1.4 },
  { Icon: GitBranch, x: "70%", y: "12%", size: 26, delay: 1.7 },
  { Icon: Sparkles, x: "28%", y: "12%", size: 24, delay: 2 },
];

const stagger: Variants = {
  hidden: {},
  shown: { transition: { staggerChildren: 0.12, delayChildren: 0.15 } },
};

const rise: Variants = {
  hidden: { y: 26, opacity: 0, filter: "blur(6px)" },
  shown: {
    y: 0,
    opacity: 1,
    filter: "blur(0px)",
    transition: { duration: 0.7, ease: [0.22, 1, 0.36, 1] },
  },
};

export function LandingHero() {
  const { messages, localeHref } = useI18n();
  const copy = messages.home.hero;
  const reduce = useReducedMotion();

  return (
    <section className="relative flex h-screen items-center justify-center overflow-hidden bg-background">
      <motion.div
        className="pointer-events-none absolute inset-0"
        style={{
          background: "radial-gradient(1200px 700px at 50% 45%, var(--color-surface-hi), var(--color-bg) 72%)",
        }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1.4 }}
        aria-hidden
      />

      <motion.div
        className="pointer-events-none absolute inset-0 flex items-center justify-center pt-16"
        initial={{ opacity: 0, scale: 1.08 }}
        animate={{ opacity: 0.85, scale: 1 }}
        transition={{ duration: 1.3, ease: [0.22, 1, 0.36, 1] }}
        aria-hidden
      >
        <motion.div
          className="relative aspect-video h-[62%] w-auto"
          animate={reduce ? undefined : { y: [-10, 10, -10] }}
          transition={{ duration: 9, repeat: Infinity, ease: "easeInOut" }}
        >
          <Image
            src="/app-preview.png"
            alt=""
            fill
            priority
            sizes="90vw"
            className="rounded-2xl object-contain shadow-[0_40px_120px_-20px_rgba(0,0,0,0.85)]"
          />
        </motion.div>
      </motion.div>

      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(680px 340px at 50% 50%, color-mix(in oklab, var(--color-bg) 92%, transparent), color-mix(in oklab, var(--color-bg) 45%, transparent) 70%, transparent)",
        }}
        aria-hidden
      />

      {GLYPHS.map(({ Icon, x, y, size, delay }, i) => (
        <motion.div
          key={i}
          className="absolute text-[color:var(--color-violet)]"
          style={{ left: x, top: y }}
          initial={{ opacity: 0, scale: 0.85 }}
          animate={
            reduce
              ? { opacity: 0.5, scale: 1 }
              : { opacity: [0.3, 0.65, 0.3], scale: [0.92, 1.08, 0.92], y: [0, -16, 0] }
          }
          transition={{ delay, duration: 7 + (i % 4), repeat: Infinity, ease: "easeInOut" }}
          whileHover={
            reduce
              ? undefined
              : { scale: 1.45, opacity: 1, filter: "drop-shadow(0 0 18px rgba(196,181,253,0.85))" }
          }
          aria-hidden
        >
          <Icon style={{ width: size, height: size }} strokeWidth={1.4} />
        </motion.div>
      ))}

      <div className="relative z-20 mx-auto w-full max-w-4xl px-5 text-center">
        <motion.div variants={stagger} initial="hidden" animate="shown" className="space-y-7">
          <motion.h1
            variants={rise}
            className="font-display text-5xl font-semibold leading-[1.05] tracking-tight text-foreground sm:text-6xl lg:text-7xl"
          >
            {copy.title}
          </motion.h1>

          <motion.p
            variants={rise}
            className="mx-auto max-w-2xl text-base leading-relaxed text-muted-foreground sm:text-lg"
          >
            {copy.subtitle}
          </motion.p>

          <motion.div
            variants={rise}
            className="flex flex-wrap items-center justify-center gap-3 pt-2"
          >
            <motion.div whileHover={reduce ? undefined : { y: -2 }} whileTap={{ y: 0 }}>
              <Button
                variant="primary"
                size="lg"
                onPress={() => {
                  window.location.href = localeHref("/login");
                }}
              >
                {copy.ctaLogin}
                <Sparkles className="h-4 w-4" aria-hidden />
              </Button>
            </motion.div>

            <motion.div whileHover={reduce ? undefined : { y: -2 }} whileTap={{ y: 0 }}>
              <Button
                variant="secondary"
                size="lg"
                onPress={() => {
                  document.getElementById("technologie")?.scrollIntoView({ behavior: "smooth" });
                }}
              >
                {copy.ctaContact}
              </Button>
            </motion.div>
          </motion.div>
        </motion.div>
      </div>

      <motion.div
        className="absolute bottom-10 left-1/2 -translate-x-1/2"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.6, duration: 0.8 }}
        aria-hidden
      >
        <motion.div
          animate={reduce ? undefined : { y: [0, 9, 0] }}
          transition={{ duration: 1.6, repeat: Infinity }}
          className="flex h-10 w-6 justify-center rounded-full border-2 border-foreground/30"
        >
          <span className="mt-2 h-2 w-1 rounded-full bg-foreground/70" />
        </motion.div>
      </motion.div>
    </section>
  );
}
