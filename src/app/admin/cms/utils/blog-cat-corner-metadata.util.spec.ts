import {
  createCmsCatCornerFormValue,
  normalizeCmsCatCornerSettings,
  parseCmsCatCornerSettings,
} from './blog-cat-corner-metadata.util';

describe('blog Cat Corner CMS metadata', () => {
  it('treats legacy posts without metadata as regular public posts', () => {
    expect(createCmsCatCornerFormValue(undefined)).toEqual({
      enabled: false,
      discoveryPost: false,
    });
  });

  it('forces discovery off whenever Cat Corner is disabled', () => {
    expect(normalizeCmsCatCornerSettings(false, true)).toEqual({
      enabled: false,
      discoveryPost: false,
    });
  });

  it('preserves the discovery choice for enabled Cat Corner posts', () => {
    expect(normalizeCmsCatCornerSettings(true, true)).toEqual({
      enabled: true,
      discoveryPost: true,
    });
    expect(normalizeCmsCatCornerSettings(true, false)).toEqual({
      enabled: true,
      discoveryPost: false,
    });
  });

  it('normalizes imported metadata and rejects incomplete shapes', () => {
    expect(parseCmsCatCornerSettings({enabled: false, discoveryPost: true})).toEqual({
      enabled: false,
      discoveryPost: false,
    });
    expect(parseCmsCatCornerSettings({enabled: true})).toBeUndefined();
    expect(parseCmsCatCornerSettings('cat-corner')).toBeUndefined();
  });
});
