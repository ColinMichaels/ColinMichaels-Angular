import {
  createCustomOscillator,
  CUSTOM_OSCILLATOR_TYPES,
  isCustomOscillatorType,
} from './custom-oscillators';

describe('custom oscillators', () => {
  it('preserves every compatibility oscillator name', () => {
    expect(CUSTOM_OSCILLATOR_TYPES).toEqual([
      'sine', 'square', 'square2', 'sawtooth', 'triangle', 'triangle2', 'chiptune',
      'organ', 'organ2', 'organ3', 'organ4', 'organ5',
      'bass', 'bass2', 'bass3', 'bass4',
      'brass', 'brass2', 'aah', 'ooh', 'eeh', 'buzz', 'buzz2', 'dissonance',
    ]);
  });

  it('matches names case-insensitively and rejects unknown types', () => {
    expect(isCustomOscillatorType(' Bass2 ')).toBeTrue();
    expect(isCustomOscillatorType('unknown')).toBeFalse();
  });

  it('creates oscillators and reuses each context wave table', () => {
    const setPeriodicWave = jasmine.createSpy('setPeriodicWave');
    const oscillator = {setPeriodicWave} as unknown as OscillatorNode;
    const periodicWave = {} as PeriodicWave;
    const createOscillator = jasmine.createSpy('createOscillator').and.returnValue(oscillator);
    const createPeriodicWave = jasmine.createSpy('createPeriodicWave').and.returnValue(periodicWave);
    const context = {createOscillator, createPeriodicWave} as unknown as AudioContext;

    expect(createCustomOscillator(context, 'bass')).toBe(oscillator);
    expect(createPeriodicWave).toHaveBeenCalledWith(jasmine.any(Float32Array), jasmine.any(Float32Array));
    expect(setPeriodicWave).toHaveBeenCalledOnceWith(periodicWave);
    expect(createCustomOscillator(context, 'bass')).toBe(oscillator);
    expect(createPeriodicWave).toHaveBeenCalledTimes(1);
    expect(setPeriodicWave).toHaveBeenCalledTimes(2);
    expect(createCustomOscillator(context, 'unknown')).toBeNull();
  });
});
