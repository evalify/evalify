import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export const languages = [
  { id: 'octave', name: 'Matlab (octave)', language_id: 66 },
  { id: 'python', name: 'Python', language_id: 71 },
  { id: 'c', name: 'C', language_id: 50 },
  { id: 'java', name: 'Java', language_id: 62 },
  { id: 'cpp', name: 'C++', language_id: 54 },
  { id: 'javascript', name: 'JavaScript', language_id: 63 },
]
