import type { ReactNode } from "react";

interface FeatureCardProps {
  icon: ReactNode;
  title: string;
  description: string;
  index: number;
}

export function FeatureCard({ icon, title, description, index }: FeatureCardProps) {
  return (
    <div
      className="feature-card group relative p-6 rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900/50 hover:border-neutral-300 dark:hover:border-neutral-700 transition-all duration-300"
      style={{ animationDelay: `${index * 100}ms` }}
    >
      <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-neutral-100/50 to-transparent dark:from-neutral-800/30 dark:to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
      <div className="relative">
        <div className="w-12 h-12 rounded-xl bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
          <div className="w-6 h-6 text-neutral-600 dark:text-neutral-400">
            {icon}
          </div>
        </div>
        <h3 className="text-lg font-semibold mb-2 text-neutral-900 dark:text-neutral-100">
          {title}
        </h3>
        <p className="text-sm text-neutral-600 dark:text-neutral-400 leading-relaxed">
          {description}
        </p>
      </div>
    </div>
  );
}
