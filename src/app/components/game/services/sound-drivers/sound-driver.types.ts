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
    label: 'Tone Sampler',
    description: 'Sampled presets',
    supportsCustomPatches: false,
  },
  {
    id: 'soundfont',
    label: 'SoundFont',
    description: 'General MIDI SoundFont instruments',
    supportsCustomPatches: false,
  },
];
