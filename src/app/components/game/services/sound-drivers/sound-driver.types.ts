// Keep `tone-sampler` as the persisted ID so existing user settings migrate to the native sampler automatically.
export type SoundDriverId = 'web-audio' | 'tone-sampler' | 'soundfont';

export interface SoundDriverMetadata {
  id: SoundDriverId;
  label: string;
  description: string;
  supportsCustomPatches: boolean;
}

export const SOUND_DRIVERS: readonly SoundDriverMetadata[] = [
  {
    id: 'web-audio',
    label: 'Web Audio',
    description: 'Editable synth patches',
    supportsCustomPatches: true,
  },
  {
    id: 'tone-sampler',
    label: 'Native Sampler',
    description: 'Efficient multi-sampled presets',
    supportsCustomPatches: false,
  },
  {
    id: 'soundfont',
    label: 'SoundFont',
    description: 'General MIDI SoundFont instruments',
    supportsCustomPatches: false,
  },
];
