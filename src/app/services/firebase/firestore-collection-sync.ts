import {getDocs, onSnapshot, type Query, type QuerySnapshot} from 'firebase/firestore';
import {BehaviorSubject} from 'rxjs';

type FirestoreValueMapper<T> = (value: unknown) => T | null;
type FirestoreErrorDescription = (error: unknown) => string;

export class FirestoreCollectionSync<T> {
  private unsubscribe: (() => void) | undefined;
  private runId = 0;
  private readonly mappedValuesByDocumentId = new Map<string, T>();

  constructor(
    private readonly valuesSubject: BehaviorSubject<readonly T[]>,
    private readonly loadingSubject: BehaviorSubject<boolean>,
    private readonly errorSubject: BehaviorSubject<string | null>,
    private readonly mapValue: FirestoreValueMapper<T>,
    private readonly describeError: FirestoreErrorDescription
  ) {}

  stop(): void {
    this.unsubscribe?.();
    this.unsubscribe = undefined;
    this.runId += 1;
  }

  async load(queryRef: Query, errorLabel: string): Promise<void> {
    this.unsubscribe?.();
    this.unsubscribe = undefined;
    const runId = this.startRun();

    try {
      this.applySnapshot(runId, await getDocs(queryRef));
    } catch (error) {
      this.applyError(runId, errorLabel, error);
    }
  }

  listen(queryRef: Query, errorLabel: string): void {
    this.unsubscribe?.();
    const runId = this.startRun();

    this.unsubscribe = onSnapshot(
      queryRef,
      snapshot => this.applySnapshot(runId, snapshot),
      error => this.applyError(runId, errorLabel, error)
    );
  }

  private startRun(): number {
    const runId = ++this.runId;
    this.mappedValuesByDocumentId.clear();
    this.loadingSubject.next(true);
    this.errorSubject.next(null);

    return runId;
  }

  private applySnapshot(runId: number, snapshot: QuerySnapshot): void {
    if (!this.isCurrentRun(runId)) {
      return;
    }

    // Firestore gives an initial batch of "added" changes followed by only the
    // documents that changed. Preserve the already validated object instances
    // so a one-document update does not remap and revalidate the entire query.
    for (const change of snapshot.docChanges()) {
      if (change.type === 'removed') {
        this.mappedValuesByDocumentId.delete(change.doc.id);
        continue;
      }

      const mappedValue = this.mapValue(change.doc.data());
      if (mappedValue === null) {
        this.mappedValuesByDocumentId.delete(change.doc.id);
      } else {
        this.mappedValuesByDocumentId.set(change.doc.id, mappedValue);
      }
    }

    const values = snapshot.docs
      .map(documentSnapshot => this.mappedValuesByDocumentId.get(documentSnapshot.id))
      .filter((value): value is T => value !== undefined);

    this.valuesSubject.next(values);
    this.loadingSubject.next(false);
  }

  private applyError(runId: number, errorLabel: string, error: unknown): void {
    if (!this.isCurrentRun(runId)) {
      return;
    }

    console.error(errorLabel, error);
    this.valuesSubject.next([]);
    this.loadingSubject.next(false);
    this.errorSubject.next(this.describeError(error));
  }

  private isCurrentRun(runId: number): boolean {
    return runId === this.runId;
  }
}
