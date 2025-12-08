import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';

export default function HomePage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center p-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="text-center mb-16"
      >
        <div className="flex items-center justify-center gap-4 mb-8">
          <div className="w-16 h-16 rounded-2xl bg-white flex items-center justify-center">
            <svg className="w-9 h-9 text-black" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
          </div>
        </div>
        <h1 className="text-5xl font-bold text-white mb-4 tracking-tight">
          MediaSoup Event Flow
        </h1>
        <p className="text-xl text-neutral-500 max-w-xl mx-auto">
          Visualize WebRTC media communication
        </p>
      </motion.div>

      {/* Single Card */}
      <motion.button
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.2 }}
        whileHover={{ y: -4, transition: { duration: 0.2 } }}
        whileTap={{ scale: 0.98 }}
        onClick={() => navigate('/mediasoup_overview')}
        className="group cursor-pointer max-w-md w-full"
      >
        <div className="relative p-8 rounded-2xl bg-neutral-950 border border-neutral-800 overflow-hidden transition-all duration-300 group-hover:border-neutral-600">
          <div className="relative">
            <div className="w-12 h-12 rounded-xl bg-white flex items-center justify-center mb-6">
              <span className="text-xl font-mono text-black">{"</>"}</span>
            </div>
            
            <h2 className="text-2xl font-bold text-white mb-3">
              Explore Event Flow
            </h2>
            
            <p className="text-neutral-500 mb-6 leading-relaxed">
              Interactive graph visualization of mediasoup's core API events for WebRTC communication.
            </p>
            
            <div className="flex items-center gap-2 text-neutral-400 group-hover:text-white transition-colors">
              <span className="text-sm font-medium">View Graph</span>
              <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </div>
        </div>
      </motion.button>

      {/* Footer */}
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6, delay: 0.4 }}
        className="mt-16 text-neutral-600 text-sm"
      >
        Click to explore the event flow graph
      </motion.p>
    </div>
  );
}
