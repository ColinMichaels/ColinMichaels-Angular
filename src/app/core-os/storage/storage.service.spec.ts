import {firstValueFrom} from 'rxjs';
import {StorageService as LegacyStorageService} from '../../components/game/services/storage.service';
import {
  IndexedDbStrategy,
  LocalStorageStrategy,
  StorageService,
  StorageStrategy
} from './storage.service';

interface IndexedDbHarness {
  factory: Pick<IDBFactory, 'open'>;
  getKeyRequest: IDBRequest<IDBValidKey | undefined>;
  getRequest: IDBRequest<unknown>;
  request: IDBOpenDBRequest;
  transaction: IDBTransaction;
}

function createIndexedDbHarness(): IndexedDbHarness {
  const getRequest = {
    error: null,
    onerror: null,
    onsuccess: null,
    result: undefined,
  } as unknown as IDBRequest<unknown>;
  const getKeyRequest = {
    error: null,
    onerror: null,
    onsuccess: null,
    result: undefined,
  } as unknown as IDBRequest<IDBValidKey | undefined>;
  const store = {
    put: () => ({}),
    get: () => getRequest,
    getKey: () => getKeyRequest,
    delete: () => ({}),
    getAllKeys: () => ({}),
    clear: () => ({})
  } as unknown as IDBObjectStore;
  const transaction = {
    error: null,
    onabort: null,
    oncomplete: null,
    onerror: null,
    objectStore: () => store
  } as unknown as IDBTransaction;
  const database = {
    close: () => undefined,
    objectStoreNames: {contains: () => true},
    onversionchange: null,
    transaction: () => transaction
  } as unknown as IDBDatabase;
  const request = {
    error: null,
    onblocked: null,
    onerror: null,
    onsuccess: null,
    onupgradeneeded: null,
    result: database
  } as unknown as IDBOpenDBRequest;
  const factory = {
    open: () => request
  } as unknown as Pick<IDBFactory, 'open'>;

  return {factory, getKeyRequest, getRequest, request, transaction};
}

describe('StorageService', () => {
  let service: StorageService;
  let storageKey: string;

  beforeEach(() => {
    service = new StorageService();
    storageKey = `core-os-storage-spec-${crypto.randomUUID()}`;
  });

  afterEach(async () => {
    await firstValueFrom(service.removeItem(storageKey));
  });

  it('round-trips a value without changing the storage key', async () => {
    const value = {enabled: true, level: 3};

    await firstValueFrom(service.setItem(storageKey, value));

    expect(await firstValueFrom(service.getItem(storageKey))).toEqual(value);
  });

  it('atomically compares revisions before replacing a value', async () => {
    expect(await firstValueFrom(service.compareAndSetItem(storageKey, null, {revision: 0, value: 'first'})))
      .toBeTrue();
    expect(await firstValueFrom(service.compareAndSetItem(storageKey, null, {revision: 0, value: 'stale'})))
      .toBeFalse();
    expect(await firstValueFrom(service.compareAndSetItem(storageKey, 0, {revision: 1, value: 'second'})))
      .toBeTrue();
    expect(await firstValueFrom(service.getItem(storageKey)))
      .toEqual({revision: 1, value: 'second'});
  });

  it('keeps the legacy path on the same Angular service token', () => {
    expect(LegacyStorageService).toBe(StorageService);
  });

  it('preserves the collection helpers', async () => {
    const value = ['one', 'two'];

    await firstValueFrom(service.setItems(storageKey, value));

    expect(await firstValueFrom(service.getItems(storageKey))).toEqual(value);
  });

  it('lists and removes the exact persisted key', async () => {
    await firstValueFrom(service.setItem(storageKey, 'value'));

    expect(await firstValueFrom(service.getAllKeys())).toContain(storageKey);

    await firstValueFrom(service.removeItem(storageKey));
    expect(await firstValueFrom(service.getItem(storageKey))).toBeNull();
  });

  it('propagates strategy write failures to callers', async () => {
    const failure = new Error('quota exceeded');
    const strategy = jasmine.createSpyObj<StorageStrategy>('StorageStrategy', [
      'setItem',
      'compareAndSetItem',
      'supportsAtomicCompareAndSet',
      'getItem',
      'getRecoverableItem',
      'getRecoveryRecord',
      'getAllKeys',
      'removeItem',
      'clear'
    ]);
    strategy.setItem.and.rejectWith(failure);
    const failingService = new StorageService(strategy);

    await expectAsync(firstValueFrom(failingService.setItem(storageKey, 'value')))
      .toBeRejectedWith(failure);
  });

  it('settles IndexedDB writes only after the transaction completes', async () => {
    const harness = createIndexedDbHarness();
    const strategy = new IndexedDbStrategy('AppStorage', 'keyvalue', 1, harness.factory);
    const write = strategy.setItem(storageKey, 'value');
    let settled = false;
    void write.then(() => {
      settled = true;
    });

    harness.request.onsuccess?.call(harness.request, new Event('success'));
    await Promise.resolve();
    expect(settled).toBeFalse();

    harness.transaction.oncomplete?.call(harness.transaction, new Event('complete'));
    await write;
    expect(settled).toBeTrue();
  });

  it('distinguishes missing, null, and undefined IndexedDB recovery values', async () => {
    const readRecord = async (value: unknown, keyResult: IDBValidKey | undefined) => {
      const harness = createIndexedDbHarness();
      const strategy = new IndexedDbStrategy('AppStorage', 'keyvalue', 1, harness.factory);
      const read = strategy.getRecoveryRecord(storageKey);
      harness.request.onsuccess?.call(harness.request, new Event('success'));
      for (let attempt = 0; attempt < 5 && !harness.getRequest.onsuccess; attempt++) {
        await Promise.resolve();
      }
      Object.defineProperty(harness.getRequest, 'result', {value, configurable: true});
      Object.defineProperty(harness.getKeyRequest, 'result', {value: keyResult, configurable: true});
      harness.getRequest.onsuccess?.call(harness.getRequest, new Event('success'));
      harness.getKeyRequest.onsuccess?.call(harness.getKeyRequest, new Event('success'));
      harness.transaction.oncomplete?.call(harness.transaction, new Event('complete'));
      return read;
    };

    expect(await readRecord(undefined, undefined)).toEqual({exists: false, value: null});
    expect(await readRecord(null, storageKey)).toEqual({exists: true, value: null});
    expect(await readRecord(undefined, storageKey)).toEqual({exists: true, value: undefined});
  });

  it('propagates an aborted IndexedDB transaction', async () => {
    const harness = createIndexedDbHarness();
    const strategy = new IndexedDbStrategy('AppStorage', 'keyvalue', 1, harness.factory);
    const removal = strategy.removeItem(storageKey);

    harness.request.onsuccess?.call(harness.request, new Event('success'));
    await Promise.resolve();
    harness.transaction.onabort?.call(harness.transaction, new Event('abort'));

    await expectAsync(removal).toBeRejectedWithError('IndexedDB transaction was aborted.');
  });

  it('keeps localStorage failures observable and refuses origin-wide clearing', async () => {
    const strategy = new LocalStorageStrategy();
    const unrelatedKey = `${storageKey}-unrelated`;
    localStorage.setItem(unrelatedKey, 'keep');

    await expectAsync(strategy.setItem(storageKey, BigInt(1))).toBeRejected();
    await expectAsync(strategy.clear()).toBeRejectedWithError(
      'Clearing the localStorage fallback is disabled to protect unrelated origin data.'
    );
    expect(localStorage.getItem(unrelatedKey)).toBe('keep');

    localStorage.removeItem(unrelatedKey);
  });

  it('only advertises localStorage compare-and-set when Web Locks can serialize it', async () => {
    const strategy = new LocalStorageStrategy();
    try {
      if (strategy.supportsAtomicCompareAndSet()) {
        expect(await strategy.compareAndSetItem(storageKey, null, {revision: 0})).toBeTrue();
        expect(await strategy.compareAndSetItem(storageKey, null, {revision: 1})).toBeFalse();
      } else {
        await expectAsync(strategy.compareAndSetItem(storageKey, null, {revision: 0}))
          .toBeRejectedWithError(/Web Locks API/);
      }
    } finally {
      localStorage.removeItem(storageKey);
    }
  });

  it('exposes malformed localStorage text only through the recovery read path', async () => {
    const strategy = new LocalStorageStrategy();
    localStorage.setItem(storageKey, '{not-json');
    try {
      await expectAsync(strategy.getItem(storageKey)).toBeRejected();
      expect(await strategy.getRecoverableItem(storageKey)).toBe('{not-json');
      if (strategy.supportsAtomicCompareAndSet()) {
        expect(await strategy.compareAndSetItem(storageKey, 0, {revision: 1})).toBeTrue();
      }
    } finally {
      localStorage.removeItem(storageKey);
    }
  });

  it('preserves a present empty localStorage value for explicit recovery', async () => {
    const strategy = new LocalStorageStrategy();
    localStorage.setItem(storageKey, '');
    try {
      await expectAsync(strategy.getItem(storageKey)).toBeRejected();
      expect(await strategy.getRecoverableItem(storageKey)).toBe('');
      if (strategy.supportsAtomicCompareAndSet()) {
        expect(await strategy.compareAndSetItem(storageKey, null, {revision: 0})).toBeFalse();
        expect(await strategy.compareAndSetItem(storageKey, 0, {revision: 1})).toBeTrue();
      }
    } finally {
      localStorage.removeItem(storageKey);
    }
  });

  it('distinguishes a present null localStorage value from a missing key during recovery', async () => {
    const strategy = new LocalStorageStrategy();
    localStorage.setItem(storageKey, 'null');
    try {
      expect(await strategy.getRecoveryRecord(storageKey)).toEqual({exists: true, value: null});
      if (strategy.supportsAtomicCompareAndSet()) {
        expect(await strategy.compareAndSetItem(storageKey, null, {revision: 1})).toBeFalse();
        expect(await strategy.compareAndSetItem(storageKey, 0, {revision: 1})).toBeTrue();
      }
    } finally {
      localStorage.removeItem(storageKey);
    }
  });
});
