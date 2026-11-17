import { renderToString, KatexOptions } from 'katex';
import 'katex/dist/katex.min.css';

export type KatexRenderOptions = KatexOptions;

const defaultOptions: KatexRenderOptions = {
  displayMode: true,
  throwOnError: false,
  errorColor: '#d32f2f',
  strict: 'warn',
  trust: false,
};

export function renderMath(latex: string, options: KatexRenderOptions = {}): string {
  try {
    return renderToString(latex, { ...defaultOptions, ...options });
  } catch (error) {
    console.error('KaTeX render error:', error);
    return `<span class="katex-error" style="color: ${options.errorColor || '#d32f2f'};">${escapeHtml(latex)}</span>`;
  }
}

export function renderMathInline(latex: string, options: KatexRenderOptions = {}): string {
  return renderMath(latex, { ...options, displayMode: false });
}

export function renderMathDisplay(latex: string, options: KatexRenderOptions = {}): string {
  return renderMath(latex, { ...options, displayMode: true });
}

function escapeHtml(text: string): string {
  if (typeof document === 'undefined') {
    return text.replace(/[&<>"']/g, (ch) => {
      switch (ch) {
        case '&':
          return '&amp;';
        case '<':
          return '&lt;';
        case '>':
          return '&gt;';
        case '"':
          return '&quot;';
        default:
          return '&#39;';
      }
    });
  }
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

export const SAMPLE_EQUATIONS = [
  {
    id: 'linear',
    label: 'Linear',
    latex: '2x + 4 = 10',
    description: 'Two-step linear equation',
  },
  {
    id: 'quadratic',
    label: 'Quadratic',
    latex: 'x^2 + 5x + 6 = 0',
    description: 'Factorable quadratic equation',
  },
  {
    id: 'fraction',
    label: 'Fraction',
    latex: '\\frac{x + 1}{2} = 3',
    description: 'Equation with rational numerator',
  },
  {
    id: 'radical',
    label: 'Radical',
    latex: '\\sqrt{x + 4} = 3',
    description: 'Radical equation with square root',
  },
] as const;

export type SampleEquationId = (typeof SAMPLE_EQUATIONS)[number]['id'];

