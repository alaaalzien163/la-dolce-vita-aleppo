import type { InputHTMLAttributes } from "react";

import { controlStyles } from "./control-styles";

interface InputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "className"> {
  readonly className?: string;
}

/**
 * Native `<input>`. No client JavaScript and no wrapper element, so it can be
 * labelled by `Field` and submitted by a plain form without hydration.
 *
 * The text direction is inherited from the document, so Arabic input renders
 * right-to-left automatically. Pass `dir="ltr"` explicitly only for values that
 * are always Latin, such as an email address or a phone number.
 */
export function Input({ className, type = "text", ...props }: InputProps) {
  return <input type={type} className={controlStyles(className)} {...props} />;
}
