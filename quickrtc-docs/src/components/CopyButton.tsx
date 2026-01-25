import { useState } from "react";
import { IconCopy, IconCheck } from "./Icons";

interface CopyButtonProps {
  text: string;
}

export function CopyButton({ text }: CopyButtonProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <button
      onClick={handleCopy}
      className="copy-btn"
      title={copied ? "Copied!" : "Copy"}
    >
      {copied ? (
        <IconCheck className="w-4 h-4" />
      ) : (
        <IconCopy className="w-4 h-4" />
      )}
    </button>
  );
}
