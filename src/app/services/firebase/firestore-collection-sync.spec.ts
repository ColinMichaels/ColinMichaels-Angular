import {QuerySnapshot} from 'firebase/firestore';
import {BehaviorSubject} from 'rxjs';

import {FirestoreCollectionSync} from './firestore-collection-sync';

interface TestValue {
  id: string;
  label: string;
}

interface SnapshotChange {
  type: 'added' | 'modified' | 'removed';
  id: string;
  value: TestValue;
}

interface TestSyncInternals {
  startRun(): number;

  applySnapshot(runId: number, snapshot: QuerySnapshot): void;
}

function createSnapshot(
  values: readonly TestValue[],
  changes: readonly SnapshotChange[]
): QuerySnapshot {
  return {
    docs: values.map(value => ({id: value.id, data: () => value})),
    docChanges: () => changes.map(change => ({
      type: change.type,
      doc: {id: change.id, data: () => change.value},
    })),
  } as unknown as QuerySnapshot;
}

describe('FirestoreCollectionSync', () => {
  it('only remaps changed documents while preserving query order', () => {
    const values = new BehaviorSubject<readonly TestValue[]>([]);
    const loading = new BehaviorSubject(false);
    const error = new BehaviorSubject<string | null>(null);
    const mapper = jasmine.createSpy('mapper').and.callFake((value: unknown) => value as TestValue);
    const sync = new FirestoreCollectionSync(values, loading, error, mapper, () => 'snapshot error');
    const internals = sync as unknown as TestSyncInternals;
    const runId = internals.startRun();
    const first = {id: 'first', label: 'First'};
    const second = {id: 'second', label: 'Second'};

    internals.applySnapshot(runId, createSnapshot(
      [first, second],
      [
        {type: 'added', id: first.id, value: first},
        {type: 'added', id: second.id, value: second},
      ]
    ));

    const updatedSecond = {...second, label: 'Updated'};
    internals.applySnapshot(runId, createSnapshot(
      [updatedSecond, first],
      [{type: 'modified', id: second.id, value: updatedSecond}]
    ));

    expect(mapper).toHaveBeenCalledTimes(3);
    expect(values.value).toEqual([updatedSecond, first]);
    expect(values.value[1]).toBe(first);
    expect(loading.value).toBeFalse();
  });

  it('drops removed and invalidated documents without remapping survivors', () => {
    const values = new BehaviorSubject<readonly TestValue[]>([]);
    const loading = new BehaviorSubject(false);
    const error = new BehaviorSubject<string | null>(null);
    const mapper = jasmine.createSpy('mapper').and.callFake((value: unknown) => {
      const candidate = value as TestValue;
      return candidate.label ? candidate : null;
    });
    const sync = new FirestoreCollectionSync(values, loading, error, mapper, () => 'snapshot error');
    const internals = sync as unknown as TestSyncInternals;
    const runId = internals.startRun();
    const first = {id: 'first', label: 'First'};
    const second = {id: 'second', label: 'Second'};

    internals.applySnapshot(runId, createSnapshot(
      [first, second],
      [
        {type: 'added', id: first.id, value: first},
        {type: 'added', id: second.id, value: second},
      ]
    ));
    internals.applySnapshot(runId, createSnapshot(
      [],
      [
        {type: 'removed', id: first.id, value: first},
        {type: 'modified', id: second.id, value: {...second, label: ''}},
      ]
    ));

    expect(mapper).toHaveBeenCalledTimes(3);
    expect(values.value).toEqual([]);
  });
});
