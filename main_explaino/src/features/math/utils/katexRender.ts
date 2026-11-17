import { renderToString, KatexOptions } from 'katex';
import 'katex/dist/katex.min.css';

export type KatexRenderOptions = KatexOptions;

const defaultOptions: KatexRenderOptions = {
  displayMode: true,
  throwOnError: false,
  errorColor: '#d32f2f',
  strict: 'warn',
  trust: false
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
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

export const SAMPLE_EQUATIONS = [
  {
    id: 'fraction',
    label: 'Stacked Fraction',
    latex: '\\frac{x + 1}{2} = 3',
    description: 'Fraction with numerator and denominator'
  },
  {
    id: 'power',
    label: 'Power/Superscript',
    latex: 'x^2 + 5x + 6 = 0',
    description: 'Quadratic equation with superscript'
  },
  {
    id: 'root',
    label: 'Square Root',
    latex: '\\sqrt{x + 4} = 3',
    description: 'Radical with vinculum'
  },
  {
    id: 'integral',
    label: 'Integral with Bounds',
    latex: '\\int_{0}^{5} x^2 \\, dx',
    description: 'Definite integral with limits'
  },
  {
    id: 'aligned',
    label: 'Aligned Multi-line',
    latex: '\\begin{aligned} x + 3 &= 7 \\\\ x &= 7 - 3 \\\\ x &= 4 \\end{aligned}',
    description: 'Step-by-step derivation with alignment'
  },
  {
    id: 'summation',
    label: 'Summation',
    latex: '\\sum_{i=1}^{n} i = \\frac{n(n+1)}{2}',
    description: 'Sigma notation with bounds'
  },
  {
    id: 'matrix',
    label: 'Matrix',
    latex: '\\begin{pmatrix} a & b \\\\ c & d \\end{pmatrix}',
    description: '2x2 matrix with parentheses'
  }
] as const;

export type SampleEquationId = typeof SAMPLE_EQUATIONS[number]['id'];