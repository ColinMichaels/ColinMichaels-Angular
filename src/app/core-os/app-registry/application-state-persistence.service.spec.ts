import {
  ApplicationStatePersistenceService as LegacyApplicationStatePersistenceService
} from '../../components/game/services/application-state-persistence.service';
import {LogService} from '../../components/game/services/log.service';
import {ApplicationStatePersistenceService} from './application-state-persistence.service';

describe('ApplicationStatePersistenceService', () => {
  let logger: jasmine.SpyObj<Pick<LogService, 'error' | 'warn'>>;
  let service: ApplicationStatePersistenceService;
  let storageKey: string;

  beforeEach(() => {
    logger = jasmine.createSpyObj<Pick<LogService, 'error' | 'warn'>>('LogService', ['error', 'warn']);
    service = new ApplicationStatePersistenceService(logger as unknown as LogService);
    storageKey = `app-registry-persistence-${crypto.randomUUID()}`;
  });

  afterEach(() => {
    localStorage.removeItem(storageKey);
  });

  it('loads string ids and the legacy object snapshot shape from the exact storage value', () => {
    localStorage.setItem(storageKey, JSON.stringify([
      'cli',
      {id: 'finder'},
      {id: 42},
      null,
      {title: 'missing id'}
    ]));

    expect(service.loadOpenApplicationIds(storageKey)).toEqual(['cli', 'finder']);
  });

  it('returns an empty list and logs malformed JSON without throwing', () => {
    localStorage.setItem(storageKey, '{not-json');

    expect(service.loadOpenApplicationIds(storageKey)).toEqual([]);
    expect(logger.warn).toHaveBeenCalledWith('Failed to parse saved applications.', jasmine.objectContaining({
      error: jasmine.any(SyntaxError)
    }));
  });

  it('writes only the supplied base-id array and keeps storage failures contained', () => {
    service.saveOpenApplicationIds(storageKey, ['cli', 'finder']);
    expect(localStorage.getItem(storageKey)).toBe('["cli","finder"]');

    const failure = new Error('quota exceeded');
    spyOn(localStorage, 'setItem').and.throwError(failure);

    expect(() => service.saveOpenApplicationIds(storageKey, ['about'])).not.toThrow();
    expect(logger.error).toHaveBeenCalledWith('Failed to persist open applications.', {
      error: failure,
      storageKey
    });
  });

  it('keeps the legacy import on the canonical root service token', () => {
    expect(LegacyApplicationStatePersistenceService).toBe(ApplicationStatePersistenceService);
  });
});
