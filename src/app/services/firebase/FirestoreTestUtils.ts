import {FirestoreService} from './firestore.service';

export interface FirestoreTestDocument {
  id: string;
  name: string;
  status: string;
  createdAt: Date;
  [key: string]: unknown;
}

/**
 * Test utilities for Firestore service integration tests
 */
export class FirestoreTestUtils {
  constructor(private firestoreService: FirestoreService) {
  }

  /**
   * Creates test data for documents
   */
  createTestDocument(overrides: Record<string, unknown> = {}): FirestoreTestDocument {
    return {
      id: `test-${Date.now()}`,
      name: 'Test Document',
      status: 'active',
      createdAt: new Date(),
      ...overrides
    };
  }

  /**
   * Creates multiple test documents
   */
  createTestDocuments(count: number, baseData: Record<string, unknown> = {}): FirestoreTestDocument[] {
    return Array.from({length: count}, (_, index) =>
      this.createTestDocument({
        ...baseData,
        name: `Test Document ${index + 1}`,
        index: index
      })
    );
  }

  /**
   * Cleans up test data by deleting documents
   */
  async cleanupTestDocuments(collectionPath: string, documentIds: string[]) {
    const deletePromises = documentIds.map(id =>
      this.firestoreService.deleteDocument(collectionPath, id).toPromise()
    );

    await Promise.all(deletePromises);
  }

  /**
   * Creates a test file for storage operations
   */
  createTestFile(filename: string = 'test.txt', content: string = 'test content') {
    return new File([content], filename, {type: 'text/plain'});
  }

  /**
   * Generates a unique collection name for tests
   */
  getTestCollectionName(baseName: string = 'test') {
    return `${baseName}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}
