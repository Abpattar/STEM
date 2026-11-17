import React, { useState, useEffect } from 'react';
import './visualizations.css';

interface EquationBalanceProps {
  initialA?: number;
  initialB?: number;
  initialC?: number;
}

export const EquationBalanceVisualizer: React.FC<EquationBalanceProps> = ({
  initialA = 2,
  initialB = 3,
  initialC = 7
}) => {
  const [a, setA] = useState(initialA);
  const [b, setB] = useState(initialB);
  const [c, setC] = useState(initialC);
  const [step, setStep] = useState(0);

  useEffect(() => {
    setA(initialA);
    setB(initialB);
    setC(initialC);
    setStep(0);
  }, [initialA, initialB, initialC]);

  const solutionX = a !== 0 ? (c - b) / a : 0;

  return (
    <div className="balance-visualizer-container" role="region" aria-label="Equation Balance Visualizer">
      <div className="visualizer-header">
        <h4>Equation Balance Scale (MathLearn Model)</h4>
        <p className="balance-hint">
          An equation is like a balanced scale. Whatever operation you perform on one side, you must perform on the other to keep it balanced.
        </p>
      </div>

      <div className="balance-scale-stage">
        {/* Scale Beam */}
        <div className="balance-beam">
          {/* Fulcrum */}
          <div className="balance-fulcrum" />

          {/* Left Pan */}
          <div className="balance-pan left-pan">
            <div className="pan-arm" />
            <div className="pan-plate">
              {step === 0 && (
                <>
                  <div className="item-tokens">
                    {Array.from({ length: Math.min(Math.abs(a), 4) }).map((_, i) => (
                      <span key={`x-${i}`} className="token-x">x</span>
                    ))}
                    {b !== 0 && <span className="token-plus">+</span>}
                    {Array.from({ length: Math.min(Math.abs(b), 6) }).map((_, i) => (
                      <span key={`b-${i}`} className="token-unit">1</span>
                    ))}
                  </div>
                  <div className="pan-label">{a}x + {b}</div>
                </>
              )}
              {step === 1 && (
                <>
                  <div className="item-tokens">
                    {Array.from({ length: Math.min(Math.abs(a), 4) }).map((_, i) => (
                      <span key={`x-${i}`} className="token-x">x</span>
                    ))}
                  </div>
                  <div className="pan-label">{a}x</div>
                </>
              )}
              {step === 2 && (
                <>
                  <div className="item-tokens">
                    <span className="token-x">x</span>
                  </div>
                  <div className="pan-label">x</div>
                </>
              )}
            </div>
          </div>

          {/* Center Equals */}
          <div className="balance-equals">=</div>

          {/* Right Pan */}
          <div className="balance-pan right-pan">
            <div className="pan-arm" />
            <div className="pan-plate">
              {step === 0 && (
                <>
                  <div className="item-tokens">
                    {Array.from({ length: Math.min(Math.abs(c), 8) }).map((_, i) => (
                      <span key={`c-${i}`} className="token-unit">1</span>
                    ))}
                  </div>
                  <div className="pan-label">{c}</div>
                </>
              )}
              {step === 1 && (
                <>
                  <div className="item-tokens">
                    {Array.from({ length: Math.min(Math.abs(c - b), 8) }).map((_, i) => (
                      <span key={`cb-${i}`} className="token-unit">1</span>
                    ))}
                  </div>
                  <div className="pan-label">{c - b}</div>
                </>
              )}
              {step === 2 && (
                <>
                  <div className="item-tokens">
                    <span className="token-unit">{solutionX}</span>
                  </div>
                  <div className="pan-label">{solutionX}</div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="balance-steps-nav">
        <button
          className={`step-btn ${step === 0 ? 'active' : ''}`}
          onClick={() => setStep(0)}
        >
          1. Original: {a}x + {b} = {c}
        </button>
        <button
          className={`step-btn ${step === 1 ? 'active' : ''}`}
          onClick={() => setStep(1)}
        >
          2. Subtract {b} from both sides: {a}x = {c - b}
        </button>
        <button
          className={`step-btn ${step === 2 ? 'active' : ''}`}
          onClick={() => setStep(2)}
        >
          3. Divide both sides by {a}: x = {solutionX}
        </button>
      </div>
    </div>
  );
};

