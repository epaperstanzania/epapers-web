'use client';

import type { ReactNode } from 'react';
import { motion, useReducedMotion } from 'motion/react';

export function CatalogueMotionCard({ children, className }: { children: ReactNode; className: string }) {
  const reduceMotion = useReducedMotion();

  return (
    <motion.li
      className={className}
      whileHover={reduceMotion ? undefined : { y: -4 }}
      whileTap={reduceMotion ? undefined : { scale: 0.99 }}
      transition={{ type: 'spring', stiffness: 390, damping: 32 }}
    >
      {children}
    </motion.li>
  );
}
