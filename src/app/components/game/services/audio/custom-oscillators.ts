import Bass from '@mohayonao/wave-tables/Bass.json';
import BassFuzz2 from '@mohayonao/wave-tables/BassFuzz2.json';
import BassSubDub from '@mohayonao/wave-tables/BassSubDub.json';
import Buzzy1 from '@mohayonao/wave-tables/Buzzy1.json';
import Dissonant2 from '@mohayonao/wave-tables/Dissonant2.json';
import DissonantPiano from '@mohayonao/wave-tables/DissonantPiano.json';
import DroppedSquare from '@mohayonao/wave-tables/DroppedSquare.json';
import DynaEPBright from '@mohayonao/wave-tables/DynaEPBright.json';
import Organ2 from '@mohayonao/wave-tables/Organ2.json';
import Organ3 from '@mohayonao/wave-tables/Organ3.json';
import PhonemeAh from '@mohayonao/wave-tables/PhonemeAh.json';
import PhonemeEe from '@mohayonao/wave-tables/PhonemeEe.json';
import PhonemeOoh from '@mohayonao/wave-tables/PhonemeOoh.json';
import Trombone from '@mohayonao/wave-tables/Trombone.json';
import WarmTriangle from '@mohayonao/wave-tables/WarmTriangle.json';

interface WaveTable {
  real: number[];
  imag: number[];
}

const HARMONIC_COUNT = 8192;
const periodicWaveCache = new WeakMap<AudioContext, Map<string, PeriodicWave>>();

const harmonicWaveTable = (coefficient: (harmonic: number) => number): WaveTable => {
  const imag = Array.from({length: HARMONIC_COUNT}, (_, harmonic) => coefficient(harmonic));
  return {
    real: imag.map(() => 0),
    imag,
  };
};

const realWaveTable = (real: number[]): WaveTable => ({
  real,
  imag: real.map(() => 0),
});

const WAVE_TABLES: Record<string, WaveTable> = {
  sine: harmonicWaveTable(harmonic => harmonic === 1 ? 1 : 0),
  square: harmonicWaveTable(harmonic => harmonic === 0 ? 0 : (2 / (harmonic * Math.PI)) * (1 - Math.pow(-1, harmonic))),
  square2: DroppedSquare,
  sawtooth: harmonicWaveTable(harmonic => harmonic === 0 ? 0 : Math.pow(-1, harmonic + 1) * (2 / (harmonic * Math.PI))),
  triangle: harmonicWaveTable(harmonic => harmonic === 0 ? 0 : (8 * Math.sin((harmonic * Math.PI) / 2)) / Math.pow(Math.PI * harmonic, 2)),
  triangle2: WarmTriangle,
  chiptune: harmonicWaveTable(harmonic => harmonic === 0 ? 0 : (4 / (harmonic * Math.PI)) * Math.sin(Math.PI * harmonic * 0.18)),
  organ: {
    real: Array.from({length: 13}, () => 0),
    imag: [0, 1, 1, 1, 1, 0, 1, 0, 1, 0, 0, 0, 1],
  },
  organ2: realWaveTable([0, 0.8, 0.6, 0.6, 0.7, 0.6, 0, 0.8, 0.3, 1]),
  organ3: Organ2,
  organ4: Organ3,
  organ5: Dissonant2,
  bass: realWaveTable([0, 1, 0.8144329896907216, 0.20618556701030927, 0.020618556701030927]),
  bass2: Bass,
  bass3: BassSubDub,
  bass4: BassFuzz2,
  brass: realWaveTable([0, 0.4, 0.4, 1, 1, 1, 0.3, 0.7, 0.6, 0.5, 0.9, 0.8]),
  brass2: Trombone,
  aah: PhonemeAh,
  ooh: PhonemeOoh,
  eeh: PhonemeEe,
  buzz: Buzzy1,
  buzz2: DynaEPBright,
  dissonance: DissonantPiano,
};

export const CUSTOM_OSCILLATOR_TYPES: readonly string[] = Object.freeze(Object.keys(WAVE_TABLES));

export const isCustomOscillatorType = (type: string): boolean =>
  Object.hasOwn(WAVE_TABLES, type.trim().toLowerCase());

export const createCustomOscillator = (context: AudioContext, type: string): OscillatorNode | null => {
  const normalizedType = type.trim().toLowerCase();
  const waveTable = WAVE_TABLES[normalizedType];
  if (!waveTable) return null;

  let contextCache = periodicWaveCache.get(context);
  if (!contextCache) {
    contextCache = new Map<string, PeriodicWave>();
    periodicWaveCache.set(context, contextCache);
  }

  let periodicWave = contextCache.get(normalizedType);
  if (!periodicWave) {
    periodicWave = context.createPeriodicWave(
      Float32Array.from(waveTable.real),
      Float32Array.from(waveTable.imag)
    );
    contextCache.set(normalizedType, periodicWave);
  }

  const oscillator = context.createOscillator();
  oscillator.setPeriodicWave(periodicWave);
  return oscillator;
};
