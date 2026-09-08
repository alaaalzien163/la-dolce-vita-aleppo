import type { TextareaHTMLAttributes } from "react";

import { cn } from "@/lib/utils/cn";

import { controlStyles } from "./control-styles";

interface TextareaProps extends Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, "className"> {
  readonly className?: string;
}

/**
 * Native `<textarea>`. `field-sizing-content` lets it grow with its value
 * without a resize observer; `min-h` keeps a sensible starting height where that
 * property is not supported.
 */
export function Textarea({ className, rows = 4, ...props }: TextareaProps) {
  return (
    <textarea
      rows={rows}
      className={cn(controlStyles(), "field-sizing-content min-h-28 resize-y", className)}
      {...props}
    />
  );
}
