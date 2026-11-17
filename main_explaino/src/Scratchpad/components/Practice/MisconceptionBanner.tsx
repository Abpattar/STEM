export interface MisconceptionBannerProps {
  misconceptions: string[];
}

export const MISCONCEPTION_INFO: Record<string, { name: string; explanation: string; tip: string }> = {
  'MC-001': {
    name: 'Square of Sum Error',
    explanation: 'You expanded (a + b)² as a² + b², missing the middle cross-term 2ab.',
    tip: 'Use (a + b)² = a² + 2ab + b².',
  },
  'MC-002': {
    name: 'Sign Error Moving Term',
    explanation: 'When you move a term across the equals sign, you must reverse its sign.',
    tip: 'Addition on one side becomes subtraction on the other side.',
  },
  'MC-003': {
    name: 'One-Sided Operation',
    explanation: 'An operation was applied to only one side of the equation.',
    tip: 'Apply the same inverse operation to both LHS and RHS to maintain balance.',
  },
  'MC-004': {
    name: 'Cancel Terms Not Factors',
    explanation: 'Only common multiplicative factors can be cancelled, not added or subtracted terms.',
    tip: 'Factor the numerator and denominator before simplifying.',
  },
  'MC-005': {
    name: 'Divide by Variable May Be Zero',
    explanation: 'Dividing both sides by a variable can discard the valid root where that variable equals 0.',
    tip: 'Move all terms to one side and factor instead of dividing by the variable.',
  },
  'MC-006': {
    name: 'Wrong Order of Operations',
    explanation: 'Operations were evaluated out of standard precedence order.',
    tip: 'Follow Parentheses, Exponents, Multiplication/Division, then Addition/Subtraction.',
  },
  'MC-007': {
    name: 'Unit Error',
    explanation: 'Quantities with different units were combined without converting them first.',
    tip: 'Convert all measurements into matching units before computing.',
  },
  'MC-008': {
    name: 'Extraneous Root Not Checked',
    explanation: 'Squaring both sides can introduce extraneous solutions that do not satisfy the original equation.',
    tip: 'Substitute candidate roots back into the original equation to verify.',
  },
  'MC-009': {
    name: 'Wrong Identity Use',
    explanation: 'Difference of squares a² - b² = (a + b)(a - b) was confused with (a - b)² = a² - 2ab + b².',
    tip: 'Double-check whether both terms are squared with subtraction between them.',
  },
  'MC-010': {
    name: 'Arithmetic Slip',
    explanation: 'There appears to be an arithmetic calculation slip in the step.',
    tip: 'Recheck each numerical operation carefully.',
  },
};

export function MisconceptionBanner({ misconceptions }: MisconceptionBannerProps) {
  const uniqueIds = Array.from(new Set(misconceptions));
  if (uniqueIds.length === 0) return null;

  return (
    <div
      className="misconception-banner"
      role="alert"
      aria-label="Detected Mathematical Misconceptions"
      data-testid="misconception-banner"
    >
      <h4>Identified Misconceptions ({uniqueIds.length})</h4>
      <ul>
        {uniqueIds.map((id) => {
          const info = MISCONCEPTION_INFO[id];
          return (
            <li key={id} className="misconception-item" data-testid={`misconception-${id}`}>
              <strong>
                {id}: {info?.name || 'Identified Concept Error'}
              </strong>
              <p>{info?.explanation || 'Review the algebraic rule applied in this step.'}</p>
              {info?.tip && <span className="misconception-tip">Tip: {info.tip}</span>}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export default MisconceptionBanner;

