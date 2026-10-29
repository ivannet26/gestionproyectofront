import type { InputHTMLAttributes } from "react";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  className?: string;
}

export default function Input({ className = "", ...props }: InputProps) {
  return (
    <input
      className={`w-full rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 py-1.5 text-xs text-neutral-800 dark:text-neutral-100 placeholder:text-neutral-600 dark:placeholder:text-neutral-500 focus:border-neutral-400 focus:outline-none ${className}`}
      {...props}
    />
  );
}
