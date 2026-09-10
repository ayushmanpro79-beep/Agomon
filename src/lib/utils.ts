import { clsx, type ClassValue } from "clsx"
// @ts-ignore - tailwind-merge types resolve at runtime
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
