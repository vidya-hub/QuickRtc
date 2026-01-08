export function AnimatedBackground() {
  return (
    <div className="absolute inset-0 pointer-events-none" style={{ overflow: 'hidden' }}>
      {/* Gradient orbs - contained within bounds */}
      <div 
        className="absolute w-[500px] h-[500px] bg-gradient-to-r from-neutral-200/20 to-neutral-300/10 dark:from-neutral-700/10 dark:to-neutral-800/5 rounded-full blur-3xl"
        style={{ top: '10%', left: '-10%' }}
      />
      <div 
        className="absolute w-[500px] h-[500px] bg-gradient-to-l from-neutral-200/20 to-neutral-300/10 dark:from-neutral-700/10 dark:to-neutral-800/5 rounded-full blur-3xl"
        style={{ bottom: '10%', right: '-10%' }}
      />
    </div>
  );
}

export function GridPattern() {
  return (
    <div className="absolute inset-0 pointer-events-none" style={{ overflow: 'hidden' }}>
      <svg className="absolute inset-0 w-full h-full opacity-[0.02] dark:opacity-[0.04]" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
            <path d="M 40 0 L 0 0 0 40" fill="none" stroke="currentColor" strokeWidth="1" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#grid)" />
      </svg>
    </div>
  );
}
