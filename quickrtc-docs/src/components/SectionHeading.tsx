import type { ReactNode } from "react";

interface SectionHeadingProps {
  badge?: string;
  title: string;
  description?: string;
  children?: ReactNode;
  align?: "left" | "center";
}

export function SectionHeading({
  badge,
  title,
  description,
  children,
  align = "center",
}: SectionHeadingProps) {
  const alignClass = align === "center" ? "text-center mx-auto" : "text-left";

  return (
    <div className={`max-w-2xl mb-12 ${alignClass}`}>
      {badge && (
        <span className="inline-block text-xs font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400 mb-3 px-3 py-1 bg-neutral-100 dark:bg-neutral-800 rounded-full">
          {badge}
        </span>
      )}
      <h2 className="text-3xl lg:text-4xl font-bold text-neutral-900 dark:text-white mb-4">
        {title}
      </h2>
      {description && (
        <p className="text-lg text-neutral-600 dark:text-neutral-400 leading-relaxed">
          {description}
        </p>
      )}
      {children}
    </div>
  );
}
