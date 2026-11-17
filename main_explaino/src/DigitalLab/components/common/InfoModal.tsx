import React from 'react';
import { X, BookOpen, Atom, FlaskConical, Microscope } from 'lucide-react';
import { soundManager } from '../../audio/SoundManager';

interface InfoModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const InfoModal: React.FC<InfoModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div
      data-testid="science-manual-modal"
      className="absolute inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/65 backdrop-blur-md science-fade-in"
    >
      <div className="glass-panel-dark w-full max-w-2xl rounded-2xl border border-slate-700/80 overflow-hidden shadow-2xl flex flex-col max-h-[85%]">
        {/* Header */}
        <div className="px-6 py-4 bg-slate-900/80 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-cyan-500/20 text-cyan-400">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-bold text-lg text-white">Science Kingdom Lab Manual</h2>
              <p className="text-xs text-slate-400">Curriculum Reference, Formulas &amp; Concepts</p>
            </div>
          </div>
          <button
            type="button"
            data-testid="manual-close-btn"
            onClick={() => {
              soundManager.playClick();
              onClose();
            }}
            className="p-2 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-6 text-slate-300 text-sm">
          {/* Physics Section */}
          <div className="space-y-2">
            <h3 className="font-bold text-cyan-400 flex items-center gap-2 text-base">
              <Atom className="w-4 h-4" /> Physics Laboratory
            </h3>
            <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800 space-y-2 text-xs leading-relaxed">
              <p>
                <strong className="text-white">Mechanics &amp; Laws of Motion:</strong>{' '}
                <code>a = F_net / m = (F_app − μ·m·g) / m</code>. Zero friction preserves constant velocity (Newton&apos;s 1st Law).
              </p>
              <p>
                <strong className="text-white">Harmonic Pendulum:</strong>{' '}
                The period of oscillation is{' '}
                <span className="font-mono text-cyan-300">T = 2π √(L / g)</span>, independent of bob mass.
              </p>
              <p>
                <strong className="text-white">Optics &amp; Dispersion:</strong>{' '}
                Gaussian thin lens equation <span className="font-mono text-cyan-300">1/f = 1/v − 1/u</span>. Short-wavelength violet bends more than long-wavelength red through a glass prism.
              </p>
              <p>
                <strong className="text-white">DC Circuits (Ohm&apos;s Law):</strong>{' '}
                <span className="font-mono text-cyan-300">V = I · R</span> and{' '}
                <span className="font-mono text-cyan-300">P = V · I</span>.
              </p>
              <p>
                <strong className="text-white">Orbital Mechanics &amp; Escape Velocity:</strong>{' '}
                Low Earth circular orbit requires ~7.9 km/s; escaping Earth&apos;s gravity well requires ~11.2 km/s.
              </p>
            </div>
          </div>

          {/* Chemistry Section */}
          <div className="space-y-2">
            <h3 className="font-bold text-emerald-400 flex items-center gap-2 text-base">
              <FlaskConical className="w-4 h-4" /> Chemistry Laboratory
            </h3>
            <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800 space-y-2 text-xs leading-relaxed">
              <p>
                <strong className="text-white">Acid-Base Neutralization &amp; Titration:</strong>{' '}
                <span className="font-mono text-emerald-300">HCl + NaOH → NaCl + H₂O</span> and{' '}
                <span className="font-mono text-emerald-300">M₁·V₁ = M₂·V₂</span>. Phenolphthalein shifts colorless → pink near pH 8.2; natural turmeric shifts yellow → blood-red in alkali.
              </p>
              <p>
                <strong className="text-white">Golden Rain Precipitation:</strong>{' '}
                <span className="font-mono text-emerald-300">Pb(NO₃)₂(aq) + 2KI(aq) → PbI₂(s)↓ + 2KNO₃(aq)</span>.
              </p>
              <p>
                <strong className="text-white">Carbonate Effervescence:</strong>{' '}
                <span className="font-mono text-emerald-300">NaHCO₃ + CH₃COOH → CH₃COONa + H₂O + CO₂↑</span>.
              </p>
            </div>
          </div>

          {/* Biology Section */}
          <div className="space-y-2">
            <h3 className="font-bold text-purple-400 flex items-center gap-2 text-base">
              <Microscope className="w-4 h-4" /> Biology Laboratory
            </h3>
            <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800 space-y-2 text-xs leading-relaxed">
              <p>
                <strong className="text-white">Plant vs Animal Cytology:</strong>{' '}
                Onion epidermal cells have rigid cellulose cell walls and large central vacuoles; cheek epithelial cells have flexible plasma membranes without cell walls.
              </p>
              <p>
                <strong className="text-white">Leaf Stomata:</strong>{' '}
                Chloroplast-rich guard cells regulate CO₂ uptake and water transpiration for photosynthesis.
              </p>
              <p>
                <strong className="text-white">Floral Anatomy (Hibiscus):</strong>{' '}
                Calyx, corolla petals, fused staminal column with pollen-bearing anthers, velvet 5-lobed stigma, inner style tunnel, and 5-chamber ovary with ovules.
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-slate-900/80 border-t border-slate-800 flex justify-end">
          <button
            type="button"
            onClick={() => {
              soundManager.playClick();
              onClose();
            }}
            className="px-5 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs transition-all shadow-lg shadow-cyan-500/20 cursor-pointer"
          >
            Got It!
          </button>
        </div>
      </div>
    </div>
  );
};

