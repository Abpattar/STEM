import React, { useState, useEffect } from 'react';
import { DialogueStep } from '../../types/laboratory';
import { ChevronRight, X, Sparkles } from 'lucide-react';
import { soundManager } from '../../audio/SoundManager';

interface SenkuGuideProps {
  dialogues: DialogueStep[];
  onComplete?: () => void;
  onDismiss?: () => void;
  visible?: boolean;
}

export const SenkuGuide: React.FC<SenkuGuideProps> = ({
  dialogues,
  onComplete,
  onDismiss,
  visible = true,
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [displayedText, setDisplayedText] = useState('');
  const [isTyping, setIsTyping] = useState(false);

  const currentStep = dialogues[currentIndex];

  useEffect(() => {
    setCurrentIndex(0);
  }, [dialogues]);

  useEffect(() => {
    if (!currentStep) return;

    setDisplayedText('');
    setIsTyping(true);
    let idx = 0;
    const text = currentStep.text;

    const interval = window.setInterval(() => {
      idx++;
      setDisplayedText(text.slice(0, idx));
      if (idx >= text.length) {
        window.clearInterval(interval);
        setIsTyping(false);
      }
    }, 18);

    return () => window.clearInterval(interval);
  }, [currentStep]);

  if (!visible || !currentStep) return null;

  const handleNext = () => {
    soundManager.playClick();
    if (isTyping) {
      setDisplayedText(currentStep.text);
      setIsTyping(false);
      return;
    }

    if (currentIndex < dialogues.length - 1) {
      setCurrentIndex((prev) => prev + 1);
    } else {
      onComplete?.();
    }
  };

  return (
    <div
      data-testid="senku-guide-box"
      className="absolute inset-x-0 bottom-0 z-40 pointer-events-none"
    >
      <div className="mb-3 sm:mb-5 mx-3 sm:mx-auto max-w-4xl pointer-events-auto science-slide-up">
        <div className="stone-panel rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row items-center sm:items-end gap-4 relative border border-amber-500/40 shadow-2xl">
          {/* Close / Skip Button */}
          <button
            type="button"
            data-testid="senku-guide-dismiss"
            onClick={() => {
              soundManager.playClick();
              onDismiss?.();
            }}
            className="absolute top-3 right-3 p-1.5 rounded-lg text-stone-400 hover:text-amber-300 hover:bg-stone-800/80 transition-colors cursor-pointer"
            title="Dismiss Guide"
          >
            <X className="w-4 h-4" />
          </button>

          {/* Mecha Senku Avatar */}
          <div className="relative flex-shrink-0 -mt-10 sm:-mt-14">
            <div className="w-18 h-18 sm:w-24 sm:h-24 rounded-full p-1 bg-gradient-to-tr from-cyan-600 via-sky-400 to-cyan-300 shadow-[0_0_24px_rgba(6,182,212,0.45)] overflow-hidden">
              <img
                src="/science-assets/mecha_senku.png"
                alt="Mecha Senku Guide"
                className="w-full h-full object-cover rounded-full border-2 border-slate-900 bg-slate-950"
              />
            </div>
            <div className="absolute -bottom-1 -right-1 bg-slate-950 border border-cyan-400 px-2 py-0.5 rounded-full text-[10px] font-black font-mono text-cyan-300 uppercase tracking-wider flex items-center gap-1 shadow-md">
              <Sparkles className="w-2.5 h-2.5 text-cyan-400" />
              Mecha
            </div>
          </div>

          {/* Dialogue Body */}
          <div className="flex-1 min-w-0 pr-6 text-center sm:text-left">
            <div className="flex items-center justify-center sm:justify-start gap-2 mb-1">
              <span className="font-bold text-amber-400 tracking-wide text-sm uppercase font-serif">
                {currentStep.speaker}
              </span>
              <span className="text-[10px] text-amber-200/80 bg-stone-800/90 px-2 py-0.5 rounded-full border border-stone-600 font-mono">
                Step {currentIndex + 1} / {dialogues.length}
              </span>
            </div>

            <p className="text-stone-100 text-sm sm:text-base leading-relaxed min-h-[3.2rem] font-serif">
              &ldquo;{displayedText}&rdquo;
              {isTyping && <span className="inline-block w-1.5 h-4 bg-amber-400 ml-1 animate-pulse" />}
            </p>

            {/* Controls */}
            <div className="flex items-center justify-end gap-3 mt-2">
              <button
                type="button"
                onClick={handleNext}
                className="px-4 py-1.5 rounded-xl bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-stone-950 font-bold text-xs sm:text-sm flex items-center gap-1.5 transition-all shadow-lg cursor-pointer"
              >
                {isTyping ? 'Skip Typing' : currentIndex < dialogues.length - 1 ? 'Next' : 'Got it!'}
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

