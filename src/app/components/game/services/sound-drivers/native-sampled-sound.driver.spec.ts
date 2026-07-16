import {LogService} from '../log.service';
import {NativeSampledSoundDriver} from './native-sampled-sound.driver';

describe('NativeSampledSoundDriver', () => {
  let logger: jasmine.SpyObj<LogService>;
  let fetchSample: jasmine.Spy;
  let decodeAudioData: jasmine.Spy;
  let createBufferSource: jasmine.Spy;
  let createGain: jasmine.Spy;
  let closeAudioContext: jasmine.Spy;
  let playbackRate: jasmine.Spy;
  let sourceStart: jasmine.Spy;
  let sourceStop: jasmine.Spy;
  let audioContext: AudioContext;
  let driver: NativeSampledSoundDriver;

  beforeEach(() => {
    logger = jasmine.createSpyObj<LogService>('LogService', ['warn']);
    fetchSample = jasmine.createSpy('fetchSample').and.resolveTo({
      ok: true,
      status: 200,
      arrayBuffer: async () => new ArrayBuffer(8),
    } as Response);

    const gainParam = {
      setValueAtTime: jasmine.createSpy('setValueAtTime'),
      exponentialRampToValueAtTime: jasmine.createSpy('exponentialRampToValueAtTime'),
    } as unknown as AudioParam;
    const gainNode = {
      gain: gainParam,
      connect: jasmine.createSpy('connectGain'),
    } as unknown as GainNode;
    const sourceNode = {
      buffer: null,
      playbackRate: {
        setValueAtTime: playbackRate = jasmine.createSpy('setPlaybackRate'),
      },
      connect: jasmine.createSpy('connectSource'),
      addEventListener: jasmine.createSpy('addEventListener'),
      start: sourceStart = jasmine.createSpy('start'),
      stop: sourceStop = jasmine.createSpy('stop'),
    } as unknown as AudioBufferSourceNode;
    const decodedBuffer = {} as AudioBuffer;

    decodeAudioData = jasmine.createSpy('decodeAudioData').and.resolveTo(decodedBuffer);
    createBufferSource = jasmine.createSpy('createBufferSource').and.returnValue(sourceNode);
    createGain = jasmine.createSpy('createGain').and.returnValue(gainNode);
    closeAudioContext = jasmine.createSpy('close').and.resolveTo(undefined);
    audioContext = {
      state: 'running',
      currentTime: 10,
      destination: {} as AudioDestinationNode,
      resume: jasmine.createSpy('resume').and.resolveTo(undefined),
      decodeAudioData,
      createBufferSource,
      createGain,
      close: closeAudioContext,
    } as unknown as AudioContext;

    driver = new NativeSampledSoundDriver(
      logger,
      () => audioContext,
      fetchSample as (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>
    );
  });

  it('preserves the sampled preset catalog', () => {
    expect(driver.canPlayPreset('Piano')).toBeTrue();
    expect(driver.canPlayPreset('Electric Piano')).toBeTrue();
    expect(driver.canPlayPreset('Unknown')).toBeFalse();
  });

  it('loads the nearest sample, pitch-shifts it, and caches the decoded buffer', async () => {
    await driver.playPreset('C#4', 0.5, 'Piano');
    await driver.playPreset('C#4', 0.5, 'Piano');

    expect(fetchSample).toHaveBeenCalledOnceWith(
      'https://gleitz.github.io/midi-js-soundfonts/FluidR3_GM/acoustic_grand_piano-mp3/C4.mp3'
    );
    expect(decodeAudioData).toHaveBeenCalledTimes(1);
    expect(createBufferSource).toHaveBeenCalledTimes(2);
    expect(createGain).toHaveBeenCalledTimes(2);
    expect(playbackRate).toHaveBeenCalledWith(Math.pow(2, 1 / 12), 10);
    expect(sourceStart).toHaveBeenCalledTimes(2);
  });

  it('logs unsupported presets without requesting a sample', async () => {
    await driver.playPreset('C4', 0.5, 'Unknown');

    expect(fetchSample).not.toHaveBeenCalled();
    expect(logger.warn).toHaveBeenCalledWith('Native sampler has no instrument for preset: Unknown');
  });

  it('evicts failed sample requests so playback can retry', async () => {
    fetchSample.and.resolveTo({ok: false, status: 404} as Response);

    await driver.playPreset('C4', 0.5, 'Piano');
    await driver.playPreset('C4', 0.5, 'Piano');

    expect(fetchSample).toHaveBeenCalledTimes(2);
    expect(logger.warn).toHaveBeenCalledTimes(2);
  });

  it('stops active sources and closes its audio context on dispose', async () => {
    await driver.playPreset('C4', 0.5, 'Piano');

    driver.dispose();

    expect(sourceStop).toHaveBeenCalled();
    expect(closeAudioContext).toHaveBeenCalled();
  });
});
