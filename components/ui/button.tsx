import { forwardRef, type ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

type Variant = "default" | "outline" | "secondary" | "ghost";
type Size = "sm" | "default" | "lg" | "icon";

const VARIANTS: Record<Variant, string> = {
  default: "bg-primary text-primary-foreground border border-primary hover:brightness-110",
  outline: "border border-white/10 bg-transparent hover:bg-white/5",
  secondary: "bg-secondary text-secondary-foreground border border-secondary hover:brightness-125",
  ghost: "border border-transparent hover:bg-white/5",
};

const SIZES: Record<Size, string> = {
  sm: "h-8 px-3 text-xs rounded-md gap-1.5",
  default: "h-9 px-4 text-sm rounded-md gap-2",
  lg: "h-10 px-8 text-sm rounded-md gap-2",
  icon: "h-9 w-9 rounded-md",
};

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = "default", size = "default", className, type = "button", ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      className={cn(
        "inline-flex items-center justify-center whitespace-nowrap font-medium transition-[filter,background-color,color] disabled:pointer-events-none disabled:opacity-50 [&_svg]:size-4 [&_svg]:shrink-0",
        VARIANTS[variant],
        SIZES[size],
        className,
      )}
      {...props}
    />
  );
});
