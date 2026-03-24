import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface Slide {
  title: string;
  content: string[];
}

interface SlideDeckProps {
  slides: Slide[];
}

export const SlideDeck: React.FC<SlideDeckProps> = ({ slides }) => {
  const [current, setCurrent] = useState(0);

  const next = () => setCurrent((prev) => (prev + 1) % slides.length);
  const prev = () => setCurrent((prev) => (prev - 1 + slides.length) % slides.length);

  return (
    <div className="relative w-full aspect-video bg-zinc-900 rounded-2xl overflow-hidden shadow-2xl group">
      <AnimatePresence mode="wait">
        <motion.div
          key={current}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          className="absolute inset-0 p-12 flex flex-col justify-center"
        >
          <h3 className="text-3xl font-bold text-white mb-8 border-l-4 border-orange-500 pl-6">
            {slides[current].title}
          </h3>
          <ul className="space-y-4">
            {slides[current].content.map((item, i) => (
              <motion.li
                key={i}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                className="text-zinc-300 text-lg flex items-start gap-3"
              >
                <span className="mt-2 w-2 h-2 rounded-full bg-orange-500 shrink-0" />
                {item}
              </motion.li>
            ))}
          </ul>
        </motion.div>
      </AnimatePresence>

      <div className="absolute bottom-8 right-8 flex gap-4 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          onClick={prev}
          className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
        >
          <ChevronLeft size={24} />
        </button>
        <button
          onClick={next}
          className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
        >
          <ChevronRight size={24} />
        </button>
      </div>

      <div className="absolute bottom-8 left-8 text-zinc-500 font-mono text-sm">
        {String(current + 1).padStart(2, '0')} / {String(slides.length).padStart(2, '0')}
      </div>
    </div>
  );
};
