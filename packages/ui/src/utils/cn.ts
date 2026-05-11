import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/** Tailwind class merge helper. The lingua franca of every shadcn component. */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
