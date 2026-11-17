interface MisconceptionBannerProps {
  misconceptions: string[];
}

const MISCONCEPTION_INFO: Record<string, { name: string; explanation: string }> = {
  'MC-001': { name: 'Square of Sum Error', explanation: 'You expanded (a+b)² as a²+b², but you missed the middle term 2ab.' },
  'MC-002': { name: 'Sign Error Moving Term', explanation: 'When you move a term across the equals sign, you must change its sign.' },
  'MC-003': { name: 'One-Sided Operation', explanation: 'You applied an operation to only one side of the equation.' },
  'MC-004': { name: 'Cancel Terms Not Factors', explanation: 'You can only cancel factors (things multiplied), not terms (things added or subtracted).' },
  'MC-005': { name: 'Divide by Variable May Be Zero', explanation: 'You divided by a variable that could be zero.' },
  'MC-006': { name: 'Wrong Order of Operations', explanation: 'You performed operations in the wrong order.' },
  'MC-007': { name: 'Unit Error', explanation: 'You combined quantities with different units.' },
  'MC-008': { name: 'Extraneous Root Not Checked', explanation: 'You squared both sides but did not check for extraneous roots.' },
  'MC-009': { name: 'Wrong Identity Use', explanation: 'You confused difference of squares with square of difference.' },
  'MC-010': { name: 'Arithmetic Slip', explanation: 'You made a small arithmetic error.' },
};

interface MisconceptionBannerProps {
  misconceptions: string[];
}

export function MisconceptionBanner({ misconceptions }: MisconceptionBannerProps) {
  return (
    <div className="misconception-banner">
      <h4>Misconceptions Detected</h4>
      <ul>
        {misconceptions.map((id) => {
          const info = MISCONCEPTION_INFO[id];
          return (
            <li key={id} className="misconception-item">
              <strong>{info?.name || id}</strong>
              <p>{info?.explanation || 'No description available.'}</p>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export default MisconceptionBanner;