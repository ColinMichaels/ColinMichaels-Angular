import {supportsDesktopOs} from './os-device.guard';

describe('supportsDesktopOs', () => {
  it('allows a desktop-sized viewport with precise pointer controls', () => {
    expect(supportsDesktopOs({
      width: 1440,
      height: 900,
      hasHover: true,
      hasFinePointer: true,
    })).toBeTrue();
  });

  it('blocks phone and narrow tablet viewports', () => {
    expect(supportsDesktopOs({
      width: 390,
      height: 844,
      hasHover: false,
      hasFinePointer: false,
    })).toBeFalse();
  });

  it('blocks large touch-only devices that cannot use hover controls', () => {
    expect(supportsDesktopOs({
      width: 1366,
      height: 1024,
      hasHover: false,
      hasFinePointer: false,
    })).toBeFalse();
  });

  it('blocks desktop pointers when the available height is too small', () => {
    expect(supportsDesktopOs({
      width: 1280,
      height: 560,
      hasHover: true,
      hasFinePointer: true,
    })).toBeFalse();
  });
});
