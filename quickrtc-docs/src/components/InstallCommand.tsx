import { CopyButton } from "./CopyButton";

interface InstallCommandProps {
  command: string;
}

export function InstallCommand({ command }: InstallCommandProps) {
  return (
    <div className="inline-flex items-center gap-3 bg-neutral-100 dark:bg-neutral-800 rounded-xl px-4 py-2.5">
      <span className="text-neutral-400 dark:text-neutral-500 select-none font-mono text-sm">$</span>
      <code className="text-sm font-mono text-neutral-700 dark:text-neutral-300">
        {command}
      </code>
      <CopyButton text={command} />
    </div>
  );
}
