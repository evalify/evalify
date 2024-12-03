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

export function getTime(){
  return new Date().toLocaleTimeString('en-US', { timeZone: 'Asia/Kolkata' })
}

export function formatBytes(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

export function formatDate(date: Date): string {
    return new Date(date).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}
