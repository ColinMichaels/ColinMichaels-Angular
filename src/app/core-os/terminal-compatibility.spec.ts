import {TypewriterService as CanonicalTypewriterService} from './terminal/typewriter.service';
import {TypewriterService as LegacyTypewriterService} from '../components/game/services/typewriter.service';

describe('Core OS terminal compatibility exports', () => {
  it('preserves the mutable root typewriter service identity', () => {
    expect(LegacyTypewriterService).toBe(CanonicalTypewriterService);
  });
});
