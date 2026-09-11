import type { SelectHTMLAttributes } from "react";

import { controlStyles } from "./control-styles";

interface SelectProps extends Omit<SelectHTMLAttributes<HTMLSelectElement>, "className"> {
  readonly className?: string;
}

/**
 * Native `<select>`. Mirrors `Input` with the same skin so form controls
 * cannot drift apart visually. The native arrow and RTL flip are inherited
 * from the platform, no custom icon needed.
 */
export function Select({ className, ...props }: SelectProps) {
  return <select className={controlStyles(className)} {...props} />;
}
