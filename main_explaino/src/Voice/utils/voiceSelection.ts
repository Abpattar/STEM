export type VoiceCandidate = { name: string; lang: string; default?: boolean };

const maleNames = [
  /microsoft (ravi|david|mark|guy|ryan|george|prabhat)\b/i,
  /google uk english male/i,
  /\b(daniel|alex|fred|arthur|aaron|thomas|oliver|rishi)\b/i,
  /\bmale\b/i,
];

export function preferredMaleVoice<T extends VoiceCandidate>(
  voices: T[],
  language = 'en-IN'
): T | undefined {
  const male = voices.filter(
    (v) => maleNames.some((x) => x.test(v.name)) && !/female/i.test(v.name)
  );
  const lang = language.toLowerCase();
  const base = lang.split('-')[0];
  return (
    male.find((v) => v.lang.toLowerCase() === lang) ||
    male.find((v) => v.lang.toLowerCase().split('-')[0] === base) ||
    (base === 'en'
      ? male.find((v) => v.lang.toLowerCase().startsWith('en-'))
      : undefined)
  );
}

export function clearSpeechSettings(rateOverride?: number) {
  return {
    rate: typeof rateOverride === 'number' ? rateOverride : 0.94,
    pitch: 1,
    volume: 1,
  } as const;
}

