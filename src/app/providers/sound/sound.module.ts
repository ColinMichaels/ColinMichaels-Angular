import {InjectionToken, Injector} from '@angular/core';

export const defaultSoundConfig: SoundServiceConfig = {
  debounceInterval: 60,
  maxCacheSize: 20,
  defaultVolume: 1.0,
  basePath: 'assets/audio/efx/'
};

export const SOUND_SERVICE_CONFIG = new InjectionToken<SoundServiceConfig>('SOUND_SERVICE_CONFIG');

export interface SoundServiceConfig {
  debounceInterval: number;
  maxCacheSize: number;
  defaultVolume: number;
  basePath: string;
}

type SoundModuleFactory = (injector: Injector) => SoundModule;

type SoundModuleProvider = {
  provide: InjectionToken<SoundModuleFactory>;
  useFactory: SoundModuleFactory;
  deps?: any[];
}

export declare class SoundModule {
  constructor();

  playSound(sound: string): void;
}

export declare function initializeSoundModule(config: SoundServiceConfig): SoundModule;

export declare function provideSound(fn: () => SoundModule): SoundModuleProvider;
