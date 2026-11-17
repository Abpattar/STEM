import { useState } from 'react';
import { SAMPLE_EQUATIONS, renderMath } from '../utils/katexRender';
import type { DisplayMode } from '../types/canvas';
import './SampleEquations.css';

interface SampleEquationsProps {
  mode: DisplayMode;
}

export function SampleEquations({ mode }: SampleEquationsProps) {
  const [selectedSample, setSelectedSample] = useState<string | null>(null);

  const handleSelect = (id: string) => {
    setSelectedSample(selectedSample === id ? null : id);
  };

  return (
    <div className="sample-equations" role="region" aria-label="Sample equations">
      <h3 className="sample-equations-title">Sample Equations (Phase 0)</h3>
      <p className="sample-equations-description">
        Click to preview KaTeX rendering in {mode === 'notebook' ? 'Notebook' : 'Textbook'} mode
      </p>
      <div className="sample-equations-grid">
        {SAMPLE_EQUATIONS.map((sample) => (
          <button
            key={sample.id}
            className={`sample-equation-btn ${selectedSample === sample.id ? 'selected' : ''}`}
            onClick={() => handleSelect(sample.id)}
            aria-pressed={selectedSample === sample.id}
            aria-label={`Preview ${sample.label}`}
          >
            <span className="sample-label">{sample.label}</span>
            <div
              className="sample-preview"
              dangerouslySetInnerHTML={{ __html: renderMath(sample.latex, { displayMode: true }) }}
            />
            {selectedSample === sample.id && (
              <div className="sample-detail">
                <p className="sample-description">{sample.description}</p>
              </div>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}