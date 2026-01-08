import type { ReactNode } from "react";
import Link from "@docusaurus/Link";
import { IconArrowRight } from "./Icons";

interface ButtonProps {
  children: ReactNode;
  to?: string;
  href?: string;
  variant?: "primary" | "secondary" | "ghost";
  size?: "sm" | "md" | "lg";
  className?: string;
  icon?: boolean;
}

export function Button({
  children,
  to,
  href,
  variant = "primary",
  size = "md",
  className = "",
  icon = false,
}: ButtonProps) {
  const baseStyles = "inline-flex items-center justify-center gap-2 font-semibold rounded-xl transition-all duration-200 group";
  
  const variants = {
    primary: "bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 hover:bg-neutral-800 dark:hover:bg-neutral-100 shadow-lg shadow-neutral-900/10 dark:shadow-white/10 hover:shadow-xl hover:shadow-neutral-900/20 dark:hover:shadow-white/20 hover:-translate-y-0.5",
    secondary: "bg-transparent border-2 border-neutral-300 dark:border-neutral-700 text-neutral-900 dark:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800 hover:border-neutral-400 dark:hover:border-neutral-600",
    ghost: "bg-transparent text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800",
  };
  
  const sizes = {
    sm: "px-4 py-2 text-sm",
    md: "px-6 py-2.5 text-sm",
    lg: "px-8 py-3 text-base",
  };

  const classes = `${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`;

  const content = (
    <>
      {children}
      {icon && (
        <IconArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform duration-200" />
      )}
    </>
  );

  if (to) {
    return (
      <Link to={to} className={classes}>
        {content}
      </Link>
    );
  }

  if (href) {
    return (
      <Link href={href} className={classes}>
        {content}
      </Link>
    );
  }

  return (
    <button className={classes}>
      {content}
    </button>
  );
}
