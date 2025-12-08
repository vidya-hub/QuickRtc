import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';

interface EventData {
  id: number;
  title: string;
  description: string;
  source: 'client' | 'server';
  target: 'client' | 'server';
  event: string;
  category: string;
  details?: {
    params?: Record<string, unknown>;
    returns?: Record<string, unknown>;
    request?: Record<string, unknown>;
    response?: Record<string, unknown>;
  };
}

interface CategoryColor {
  bg: string;
  border: string;
  text: string;
  gradient: string;
}

interface FlowVisualizationProps {
  events: EventData[];
  categoryColors: Record<string, CategoryColor>;
  title: string;
  subtitle: string;
  accentColor: 'sky' | 'purple';
}

export default function FlowVisualization({
  events,
  categoryColors,
  title,
  subtitle,
  accentColor
}: FlowVisualizationProps) {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playSpeed, setPlaySpeed] = useState(2000);
  const intervalRef = useRef<number | null>(null);

  const currentEvent = events[currentStep];
  const categoryColor = categoryColors[currentEvent.category];

  const goToNext = useCallback(() => {
    setCurrentStep((prev) => (prev < events.length - 1 ? prev + 1 : prev));
  }, [events.length]);

  const goToPrev = useCallback(() => {
    setCurrentStep((prev) => (prev > 0 ? prev - 1 : prev));
  }, []);

  const togglePlay = useCallback(() => {
    setIsPlaying((prev) => !prev);
  }, []);

  const reset = useCallback(() => {
    setCurrentStep(0);
    setIsPlaying(false);
  }, []);

  // Auto-play
  useEffect(() => {
    if (isPlaying) {
      intervalRef.current = window.setInterval(() => {
        setCurrentStep((prev) => {
          if (prev >= events.length - 1) {
            setIsPlaying(false);
            return prev;
          }
          return prev + 1;
        });
      }, playSpeed);
    } else if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isPlaying, playSpeed, events.length]);

  // Keyboard controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') goToNext();
      else if (e.key === 'ArrowLeft') goToPrev();
      else if (e.key === ' ') { e.preventDefault(); togglePlay(); }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [goToNext, goToPrev, togglePlay]);

  const gradientClass = accentColor === 'sky' 
    ? 'from-sky-500 to-cyan-500' 
    : 'from-purple-500 to-pink-500';

  const accentTextClass = accentColor === 'sky' ? 'text-sky-400' : 'text-purple-400';
  const accentBorderClass = accentColor === 'sky' ? 'border-sky-500/30' : 'border-purple-500/30';

  return (
    <div className="min-h-screen bg-slate-900 text-white">
      {/* Background */}
      <div className="fixed inset-0 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 -z-10" />
      <div 
        className="fixed inset-0 -z-10 opacity-[0.02]"
        style={{
          backgroundImage: `radial-gradient(circle at 1px 1px, rgba(255,255,255,0.3) 1px, transparent 0)`,
          backgroundSize: '40px 40px'
        }}
      />

      {/* Header */}
      <header className="sticky top-0 z-50 backdrop-blur-xl bg-slate-900/80 border-b border-slate-800">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/')}
              className="p-2 rounded-xl hover:bg-slate-800 transition-colors"
            >
              <svg className="w-5 h-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
            </button>
            <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${gradientClass} flex items-center justify-center`}>
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            </div>
            <div>
              <h1 className="text-lg font-semibold">{title}</h1>
              <p className="text-sm text-slate-500">{subtitle}</p>
            </div>
          </div>
          
          {/* Step Counter */}
          <div className={`px-4 py-2 rounded-full bg-slate-800 ${accentTextClass} text-sm font-medium`}>
            Step {currentStep + 1} of {events.length}
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8 pb-32">
        {/* Progress Bar */}
        <div className="mb-6">
          <div className="h-1 rounded-full bg-slate-800 overflow-hidden">
            <motion.div
              className={`h-full bg-gradient-to-r ${gradientClass}`}
              initial={{ width: 0 }}
              animate={{ width: `${((currentStep + 1) / events.length) * 100}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>
          {/* Category Legend */}
          <div className="flex flex-wrap gap-3 mt-4">
            {Object.entries(categoryColors).map(([category, colors]) => (
              <div 
                key={category}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg ${colors.bg} border ${colors.border} transition-opacity ${
                  currentEvent.category === category ? 'opacity-100' : 'opacity-40'
                }`}
              >
                <div className={`w-2 h-2 rounded-full bg-gradient-to-r ${colors.gradient}`} />
                <span className={`text-xs font-medium ${colors.text} capitalize`}>{category}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Main Visualization */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Flow Diagram - Takes 2 columns */}
          <div className="lg:col-span-2 space-y-6">
            {/* Client-Server Diagram */}
            <div className={`rounded-2xl bg-slate-800/50 border ${accentBorderClass} p-8`}>
              <div className="relative h-64 flex items-center justify-between">
                {/* Client */}
                <motion.div
                  animate={{
                    scale: currentEvent.source === 'client' ? 1.02 : 1,
                    boxShadow: currentEvent.source === 'client' 
                      ? '0 0 40px rgba(14, 165, 233, 0.3)' 
                      : '0 0 0px transparent'
                  }}
                  transition={{ duration: 0.3 }}
                  className="w-36 h-44 rounded-2xl bg-slate-900 border-2 border-slate-700 flex flex-col items-center justify-center p-4 relative"
                >
                  <div className="text-5xl mb-3">{"</>"}</div>
                  <span className="font-bold text-sky-400 text-lg">CLIENT</span>
                  <span className="text-xs text-slate-500 mt-1">mediasoup-client</span>
                  
                  {currentEvent.source === 'client' && (
                    <motion.div
                      className="absolute -right-2 top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-sky-500"
                      animate={{ scale: [1, 1.5, 1], opacity: [1, 0.5, 1] }}
                      transition={{ duration: 1, repeat: Infinity }}
                    />
                  )}
                </motion.div>

                {/* Connection Line with Packet */}
                <div className="flex-1 mx-8 relative h-1">
                  {/* Base line */}
                  <div className="absolute inset-0 bg-slate-700 rounded-full" />
                  
                  {/* Animated packet */}
                  <AnimatePresence mode="wait">
                    {currentEvent.source !== currentEvent.target && (
                      <motion.div
                        key={`packet-${currentStep}`}
                        className={`absolute top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-gradient-to-r ${categoryColor.gradient}`}
                        style={{ 
                          boxShadow: `0 0 20px ${accentColor === 'sky' ? 'rgba(14, 165, 233, 0.5)' : 'rgba(168, 85, 247, 0.5)'}`,
                          left: currentEvent.source === 'client' ? '0%' : '100%'
                        }}
                        animate={{
                          left: currentEvent.source === 'client' ? '100%' : '0%',
                          scale: [1, 1.2, 1]
                        }}
                        transition={{ duration: 0.8, ease: "easeInOut" }}
                      />
                    )}
                  </AnimatePresence>

                  {/* Event Label */}
                  <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 -mt-8">
                    <AnimatePresence mode="wait">
                      <motion.div
                        key={`event-${currentStep}`}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ duration: 0.2 }}
                        className={`px-4 py-2 rounded-xl ${categoryColor.bg} border ${categoryColor.border} backdrop-blur-sm`}
                      >
                        <code className={`text-sm font-mono ${categoryColor.text}`}>
                          {currentEvent.event}
                        </code>
                      </motion.div>
                    </AnimatePresence>
                  </div>

                  {/* Direction Arrow */}
                  <div className="absolute left-1/2 -translate-x-1/2 top-8 text-slate-500 text-xl">
                    {currentEvent.source === 'client' && currentEvent.target === 'server' && '→'}
                    {currentEvent.source === 'server' && currentEvent.target === 'client' && '←'}
                    {currentEvent.source === currentEvent.target && '⟳'}
                  </div>
                </div>

                {/* Server */}
                <motion.div
                  animate={{
                    scale: currentEvent.target === 'server' || currentEvent.source === 'server' ? 1.02 : 1,
                    boxShadow: currentEvent.target === 'server' || currentEvent.source === 'server'
                      ? '0 0 40px rgba(168, 85, 247, 0.3)' 
                      : '0 0 0px transparent'
                  }}
                  transition={{ duration: 0.3 }}
                  className="w-36 h-44 rounded-2xl bg-slate-900 border-2 border-slate-700 flex flex-col items-center justify-center p-4 relative"
                >
                  <div className="text-5xl mb-3">{"{ }"}</div>
                  <span className="font-bold text-purple-400 text-lg">SERVER</span>
                  <span className="text-xs text-slate-500 mt-1">mediasoup</span>
                  
                  {(currentEvent.target === 'server' && currentEvent.source !== 'server') && (
                    <motion.div
                      className="absolute -left-2 top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-purple-500"
                      animate={{ scale: [1, 1.5, 1], opacity: [1, 0.5, 1] }}
                      transition={{ duration: 1, repeat: Infinity }}
                    />
                  )}
                </motion.div>
              </div>
            </div>

            {/* Event Details */}
            <AnimatePresence mode="wait">
              <motion.div
                key={`details-${currentStep}`}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3 }}
                className={`rounded-2xl ${categoryColor.bg} border ${categoryColor.border} p-6`}
              >
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <span className={`text-xs px-3 py-1 rounded-full ${categoryColor.text} bg-slate-900/50 uppercase tracking-wider font-medium`}>
                      {currentEvent.category}
                    </span>
                    <h2 className="text-2xl font-bold mt-3">{currentEvent.title}</h2>
                  </div>
                  <span className={`text-4xl font-bold ${categoryColor.text} opacity-50`}>
                    {String(currentEvent.id).padStart(2, '0')}
                  </span>
                </div>
                <p className="text-slate-300 text-lg leading-relaxed">{currentEvent.description}</p>
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Sidebar - Timeline & Data */}
          <div className="space-y-6">
            {/* Data Panel */}
            {currentEvent.details && (
              <AnimatePresence mode="wait">
                <motion.div
                  key={`data-${currentStep}`}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.3 }}
                  className="rounded-2xl bg-slate-800/50 border border-slate-700/50 p-5"
                >
                  <h3 className="text-sm font-semibold text-slate-400 mb-4 uppercase tracking-wider">Data Flow</h3>
                  
                  {(currentEvent.details.params || currentEvent.details.request) && (
                    <div className="mb-4">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-2 h-2 rounded-full bg-emerald-500" />
                        <span className="text-xs text-emerald-400 font-medium uppercase">
                          {currentEvent.details.params ? 'Params' : 'Request'}
                        </span>
                      </div>
                      <pre className="text-xs p-3 rounded-lg bg-slate-900/80 text-emerald-300 overflow-auto max-h-32">
                        {JSON.stringify(currentEvent.details.params || currentEvent.details.request, null, 2)}
                      </pre>
                    </div>
                  )}
                  
                  {(currentEvent.details.returns || currentEvent.details.response) && (
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-2 h-2 rounded-full bg-sky-500" />
                        <span className="text-xs text-sky-400 font-medium uppercase">
                          {currentEvent.details.returns ? 'Returns' : 'Response'}
                        </span>
                      </div>
                      <pre className="text-xs p-3 rounded-lg bg-slate-900/80 text-sky-300 overflow-auto max-h-32">
                        {JSON.stringify(currentEvent.details.returns || currentEvent.details.response, null, 2)}
                      </pre>
                    </div>
                  )}
                </motion.div>
              </AnimatePresence>
            )}

            {/* Mini Timeline */}
            <div className="rounded-2xl bg-slate-800/50 border border-slate-700/50 p-5">
              <h3 className="text-sm font-semibold text-slate-400 mb-4 uppercase tracking-wider">Timeline</h3>
              <div className="space-y-1 max-h-64 overflow-auto pr-2 custom-scrollbar">
                {events.map((event, idx) => {
                  const eventColor = categoryColors[event.category];
                  return (
                    <button
                      key={event.id}
                      onClick={() => setCurrentStep(idx)}
                      className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-all ${
                        idx === currentStep
                          ? `${eventColor.bg} ${eventColor.text} border ${eventColor.border}`
                          : idx < currentStep
                          ? 'text-slate-600 hover:text-slate-400 hover:bg-slate-800/50'
                          : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800/50'
                      }`}
                    >
                      <span className="font-mono mr-2 opacity-50">{String(event.id).padStart(2, '0')}</span>
                      <span className={idx === currentStep ? '' : 'truncate'}>{event.title}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Fixed Controls */}
      <div className="fixed bottom-0 left-0 right-0 bg-slate-900/95 backdrop-blur-xl border-t border-slate-800">
        <div className="max-w-6xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            {/* Speed Control */}
            <div className="flex items-center gap-3">
              <span className="text-sm text-slate-500">Speed</span>
              <select
                value={playSpeed}
                onChange={(e) => setPlaySpeed(Number(e.target.value))}
                className="px-3 py-2 rounded-lg bg-slate-800 text-white border border-slate-700 text-sm focus:outline-none focus:border-slate-600"
              >
                <option value={3000}>0.5x</option>
                <option value={2000}>1x</option>
                <option value={1000}>2x</option>
                <option value={500}>4x</option>
              </select>
            </div>

            {/* Main Controls */}
            <div className="flex items-center gap-2">
              <button
                onClick={reset}
                className="p-3 rounded-xl bg-slate-800 hover:bg-slate-700 transition-colors"
                title="Reset"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
              </button>
              <button
                onClick={goToPrev}
                disabled={currentStep === 0}
                className="p-3 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-30 disabled:hover:bg-slate-800 transition-colors"
                title="Previous"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <button
                onClick={togglePlay}
                className={`p-4 rounded-xl transition-colors ${
                  isPlaying 
                    ? 'bg-red-500 hover:bg-red-600' 
                    : `bg-gradient-to-r ${gradientClass} hover:opacity-90`
                }`}
                title="Play/Pause"
              >
                {isPlaying ? (
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 9v6m4-6v6" />
                  </svg>
                ) : (
                  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M8 5v14l11-7z" />
                  </svg>
                )}
              </button>
              <button
                onClick={goToNext}
                disabled={currentStep === events.length - 1}
                className="p-3 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-30 disabled:hover:bg-slate-800 transition-colors"
                title="Next"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
              <button
                onClick={() => setCurrentStep(events.length - 1)}
                className="p-3 rounded-xl bg-slate-800 hover:bg-slate-700 transition-colors"
                title="Go to End"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7m0 0l-7 7m7-7H6" />
                </svg>
              </button>
            </div>

            {/* Keyboard Hints */}
            <div className="hidden md:flex items-center gap-2 text-xs text-slate-600">
              <kbd className="px-2 py-1 rounded bg-slate-800 border border-slate-700">←</kbd>
              <kbd className="px-2 py-1 rounded bg-slate-800 border border-slate-700">→</kbd>
              <kbd className="px-2 py-1 rounded bg-slate-800 border border-slate-700">Space</kbd>
            </div>
          </div>
        </div>
      </div>

      {/* Custom scrollbar styles */}
      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #334155;
          border-radius: 2px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #475569;
        }
      `}</style>
    </div>
  );
}
