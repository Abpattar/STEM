import React, { useState, useEffect } from 'react';
import { soundEffects } from '../../utils/soundEffects';

export interface EquationBalanceProps {
  initialA?: number;
  initialB?: number;
  initialC?: number;
}

export const EquationBalanceVisualizer: React.FC<EquationBalanceProps> = ({
  initialA = 2,
  initialB = 3,
  initialC = 7,
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

  const safeA = a === 0 ? 1 : a;
  const solutionX = (c - b) / safeA;
  const formattedSolution = Number.isInteger(solutionX)
    ? String(solutionX)
    : solutionX.toFixed(2);
  const bOpLabel = b >= 0 ? `Subtract ${b}` : `Add ${Math.abs(b)}`;
  const leftOriginalLabel =
    b === 0 ? `${safeA}x` : b > 0 ? `${safeA}x + ${b}` : `${safeA}x - ${Math.abs(b)}`;

  return (
    <div
      className="balance-visualizer-container"
      role="region"
      aria-label="Equation Balance Visualizer"
      data-testid="equation-balance-visualizer"
    >
      <div className="visualizer-header">
        <div>
          <h4>Equation Balance Scale (MathLearn Model)</h4>
          <p className="balance-hint">
            An equation is like a balanced scale. Whatever operation you perform on one side, you
            must perform on the other to keep it balanced.
          </p>
        </div>
        <div className="current-equation" data-testid="balance-current-eq">
          {step === 0
            ? `${leftOriginalLabel} = ${c}`
            : step === 1
              ? `${safeA}x = ${c - b}`
              : `x = ${formattedSolution}`}
        </div>
      </div>

      <div className="controls-row">
        <div className="slider-group">
          <label htmlFor="nilo-balance-a">Coefficient a = {safeA}</label>
          <input
            id="nilo-balance-a"
            type="range"
            min="1"
            max="6"
            step="1"
            value={safeA}
            onChange={(e) => {
              setA(Number(e.target.value));
              setStep(0);
              soundEffects.playClick(380, 0.03);
            }}
          />
        </div>
        <div className="slider-group">
          <label htmlFor="nilo-balance-b">Constant b = {b}</label>
          <input
            id="nilo-balance-b"
            type="range"
            min="-6"
            max="8"
            step="1"
            value={b}
            onChange={(e) => {
              setB(Number(e.target.value));
              setStep(0);
              soundEffects.playClick(420, 0.03);
            }}
          />
        </div>
        <div className="slider-group">
          <label htmlFor="nilo-balance-c">Right Side c = {c}</label>
          <input
            id="nilo-balance-c"
            type="range"
            min="-4"
            max="16"
            step="1"
            value={c}
            onChange={(e) => {
              setC(Number(e.target.value));
              setStep(0);
              soundEffects.playClick(460, 0.03);
            }}
          />
        </div>
      </div>

      <div className="balance-scale-stage">
        <div className="balance-beam">
          <div className="balance-fulcrum" />

          <div className="balance-pan left-pan" data-testid="balance-left-pan">
            <div className="pan-arm" />
            <div className="pan-plate">
              {step === 0 && (
                <>
                  <div className="item-tokens">
                    {Array.from({ length: Math.min(Math.abs(safeA), 6) }).map((_, i) => (
                      <span key={`x-${i}`} className="token-x">
                        x
                      </span>
                    ))}
                    {b !== 0 && <span className="token-plus">{b > 0 ? '+' : '−'}</span>}
                    {Array.from({ length: Math.min(Math.abs(b), 6) }).map((_, i) => (
                      <span key={`b-${i}`} className="token-unit">
                        {b > 0 ? '1' : '-1'}
                      </span>
                    ))}
                  </div>
                  <div className="pan-label">{leftOriginalLabel}</div>
                </>
              )}
              {step === 1 && (
                <>
                  <div className="item-tokens">
                    {Array.from({ length: Math.min(Math.abs(safeA), 6) }).map((_, i) => (
                      <span key={`x-${i}`} className="token-x">
                        x
                      </span>
                    ))}
                  </div>
                  <div className="pan-label">{safeA}x</div>
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

          <div className="balance-equals">=</div>

          <div className="balance-pan right-pan" data-testid="balance-right-pan">
            <div className="pan-arm" />
            <div className="pan-plate">
              {step === 0 && (
                <>
                  <div className="item-tokens">
                    {c === 0 ? (
                      <span className="token-unit">0</span>
                    ) : (
                      Array.from({ length: Math.min(Math.abs(c), 8) }).map((_, i) => (
                        <span key={`c-${i}`} className="token-unit">
                          {c > 0 ? '1' : '-1'}
                        </span>
                      ))
                    )}
                  </div>
                  <div className="pan-label">{c}</div>
                </>
              )}
              {step === 1 && (
                <>
                  <div className="item-tokens">
                    {c - b === 0 ? (
                      <span className="token-unit">0</span>
                    ) : (
                      Array.from({ length: Math.min(Math.abs(c - b), 8) }).map((_, i) => (
                        <span key={`cb-${i}`} className="token-unit">
                          {c - b > 0 ? '1' : '-1'}
                        </span>
                      ))
                    )}
                  </div>
                  <div className="pan-label">{c - b}</div>
                </>
              )}
              {step === 2 && (
                <>
                  <div className="item-tokens">
                    <span className="token-unit">{formattedSolution}</span>
                  </div>
                  <div className="pan-label">{formattedSolution}</div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="balance-steps-nav">
        <button
          type="button"
          className={`step-btn ${step === 0 ? 'active' : ''}`}
          onClick={() => {
            setStep(0);
            soundEffects.playClick(420, 0.04);
          }}
        >
          1. Original: {leftOriginalLabel} = {c}
        </button>
        <button
          type="button"
          className={`step-btn ${step === 1 ? 'active' : ''}`}
          onClick={() => {
            setStep(1);
            soundEffects.playClick(500, 0.04);
          }}
        >
          2. {bOpLabel} both sides: {safeA}x = {c - b}
        </button>
        <button
          type="button"
          className={`step-btn ${step === 2 ? 'active' : ''}`}
          onClick={() => {
            setStep(2);
            soundEffects.playSuccessChime();
          }}
        >
          3. Divide both sides by {safeA}: x = {formattedSolution}
        </button>
      </div>
    </div>
  );
};

