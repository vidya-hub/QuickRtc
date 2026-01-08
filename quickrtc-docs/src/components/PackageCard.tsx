import { IconTerminal, IconServer, IconReact } from "./Icons";
import { CopyButton } from "./CopyButton";

interface PackageCardProps {
  name: string;
  description: string;
  install: string;
  type: "client" | "server" | "react";
}

const icons = {
  client: IconTerminal,
  server: IconServer,
  react: IconReact,
};

export function PackageCard({ name, description, install, type }: PackageCardProps) {
  const Icon = icons[type];

  return (
    <div className="package-card group relative p-6 rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900/50 hover:border-neutral-300 dark:hover:border-neutral-700 transition-all duration-300 overflow-hidden">
      <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-neutral-100 to-transparent dark:from-neutral-800/50 dark:to-transparent rounded-bl-full opacity-50" />
      
      <div className="relative">
        <div className="flex items-start justify-between mb-4">
          <div className="w-10 h-10 rounded-lg bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center">
            <Icon className="w-5 h-5 text-neutral-600 dark:text-neutral-400" />
          </div>
          <span className="text-xs font-medium px-2 py-1 rounded-full bg-neutral-100 dark:bg-neutral-800 text-neutral-500 dark:text-neutral-400">
            npm
          </span>
        </div>
        
        <h3 className="font-mono font-semibold text-neutral-900 dark:text-neutral-100 mb-2">
          {name}
        </h3>
        <p className="text-sm text-neutral-600 dark:text-neutral-400 mb-4 leading-relaxed">
          {description}
        </p>
        
        <div className="flex items-center gap-2 bg-neutral-100 dark:bg-neutral-800 rounded-lg px-3 py-2">
          <code className="text-xs font-mono text-neutral-700 dark:text-neutral-300 flex-1 truncate">
            {install}
          </code>
          <CopyButton text={install} />
        </div>
      </div>
    </div>
  );
}
