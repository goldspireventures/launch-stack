'use client';

import * as React from 'react';
import { motion, type HTMLMotionProps, type Transition } from 'framer-motion';
import { cn } from '../utils/cn';

/**
 * Goldspire animation kit.
 *
 * Five primitives cover ~90% of "make this feel alive" cases:
 *
 *   <FadeIn>            — opacity 0 → 1, on mount
 *   <SlideUp>           — translateY(8px) + fade, on mount
 *   <Reveal>            — translateY(16px) + fade, on intersection
 *   <Stagger>           — wraps children; siblings inside <StaggerItem> animate in sequence
 *   <Press>             — tactile press feedback (scale 0.97 on tap)
 *
 * Plus a small `springs` registry so spring config is shared, not re-derived
 * everywhere. Use these for transitions; reach for raw `motion.*` only when
 * a one-off animation needs custom keyframes.
 *
 * All components are client-only (framer-motion uses hooks). Importing into a
 * server component is fine because they're prefixed with `use client`.
 */

export const springs = {
  /** Default UI spring — snappy but not bouncy. */
  ui: { type: 'spring', stiffness: 380, damping: 32, mass: 0.9 } as Transition,
  /** Slower spring for hero / page-level reveals. */
  hero: { type: 'spring', stiffness: 220, damping: 26 } as Transition,
  /** Tween for cases where spring overshoot looks wrong (icons rotating, etc.). */
  tween: { type: 'tween', ease: [0.22, 1, 0.36, 1], duration: 0.28 } as Transition,
} as const;

type DivMotionProps = HTMLMotionProps<'div'>;

export interface FadeInProps extends DivMotionProps {
  delay?: number;
  duration?: number;
}

export const FadeIn = React.forwardRef<HTMLDivElement, FadeInProps>(
  ({ delay = 0, duration = 0.28, transition, children, ...rest }, ref) => (
    <motion.div
      ref={ref}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={transition ?? { duration, delay, ease: [0.22, 1, 0.36, 1] }}
      {...rest}
    >
      {children}
    </motion.div>
  ),
);
FadeIn.displayName = 'FadeIn';

export interface SlideUpProps extends DivMotionProps {
  delay?: number;
  distance?: number;
}

export const SlideUp = React.forwardRef<HTMLDivElement, SlideUpProps>(
  ({ delay = 0, distance = 8, transition, children, ...rest }, ref) => (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: distance }}
      animate={{ opacity: 1, y: 0 }}
      transition={transition ?? { ...springs.ui, delay }}
      {...rest}
    >
      {children}
    </motion.div>
  ),
);
SlideUp.displayName = 'SlideUp';

export interface RevealProps extends DivMotionProps {
  distance?: number;
  /** Pixel offset before viewport for the reveal trigger. Default `-80px`. */
  rootMargin?: string;
}

/**
 * Mount-on-intersection variant: doesn't animate until the element is near
 * the viewport. Use for content below the fold; avoids stuttery janky
 * "everything animates at once" reveals on long pages.
 */
export const Reveal = React.forwardRef<HTMLDivElement, RevealProps>(
  ({ distance = 16, transition, children, rootMargin: _rootMargin, ...rest }, ref) => (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: distance }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-80px' }}
      transition={transition ?? springs.hero}
      {...rest}
    >
      {children}
    </motion.div>
  ),
);
Reveal.displayName = 'Reveal';

export interface StaggerProps extends DivMotionProps {
  /** Delay between each child's animation (seconds). Default 0.05. */
  step?: number;
  /** Delay before the first child animates. Default 0. */
  initialDelay?: number;
}

const staggerContainerVariants = {
  hidden: {},
  visible: ({ step, initialDelay }: { step: number; initialDelay: number }) => ({
    transition: { staggerChildren: step, delayChildren: initialDelay },
  }),
};

const staggerItemVariants = {
  hidden: { opacity: 0, y: 8 },
  visible: { opacity: 1, y: 0, transition: springs.ui },
};

export function Stagger({
  step = 0.05,
  initialDelay = 0,
  children,
  ...rest
}: StaggerProps) {
  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={staggerContainerVariants}
      custom={{ step, initialDelay }}
      {...rest}
    >
      {children}
    </motion.div>
  );
}

export function StaggerItem({ children, ...rest }: DivMotionProps) {
  return (
    <motion.div variants={staggerItemVariants} {...rest}>
      {children}
    </motion.div>
  );
}

export interface PressProps extends DivMotionProps {
  scale?: number;
}

/**
 * Tactile button-press feedback. Wrap interactive cards / chips / list rows.
 * Doesn't render a button — `<button>` or `<a>` should still be the child.
 */
export function Press({ scale = 0.97, children, ...rest }: PressProps) {
  return (
    <motion.div whileTap={{ scale }} transition={springs.ui} {...rest}>
      {children}
    </motion.div>
  );
}

/* ─── Page transition wrapper ──────────────────────────────────────────── */

export interface PageTransitionProps {
  children: React.ReactNode;
  className?: string;
  /** Disables the animation (use for SSR-critical content). */
  disabled?: boolean;
}

/**
 * Drop-in page wrapper that gives every route an 80ms fade + 4px slide. Cheap,
 * universally improves perceived smoothness. Place inside layouts BELOW any
 * fixed chrome (sidebar/topbar) so chrome doesn't re-animate on every nav.
 */
export function PageTransition({ children, className, disabled }: PageTransitionProps) {
  if (disabled) return <div className={className}>{children}</div>;
  return (
    <motion.div
      className={cn(className)}
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  );
}

export { motion, AnimatePresence } from 'framer-motion';
export type { MotionProps, Variants, Transition } from 'framer-motion';
