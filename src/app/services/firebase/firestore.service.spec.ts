import {TestBed} from '@angular/core/testing';
import {Firestore} from '@angular/fire/firestore';
import {Storage} from '@angular/fire/storage';
import {FirestoreService, FirestoreDocument} from './firestore.service';
import {of} from 'rxjs';

describe('FirestoreService', () => {
  let service: FirestoreService;
  let mockFirestore: jasmine.SpyObj<Firestore>;
  let mockStorage: jasmine.SpyObj<Storage>;

  // Mock implementations for Firebase functions
  let mockDoc: jasmine.Spy;
  let mockCollection: jasmine.Spy;
  let mockSetDoc: jasmine.Spy;
  let mockGetDoc: jasmine.Spy;
  let mockUpdateDoc: jasmine.Spy;
  let mockDeleteDoc: jasmine.Spy;
  let mockGetDocs: jasmine.Spy;
  let mockQuery: jasmine.Spy;
  let mockWhere: jasmine.Spy;
  let mockOrderBy: jasmine.Spy;
  let mockLimit: jasmine.Spy;
  let mockOnSnapshot: jasmine.Spy;
  let mockServerTimestamp: jasmine.Spy;
  let mockWriteBatch: jasmine.Spy;

  // Storage mocks
  let mockRef: jasmine.Spy;
  let mockUploadBytes: jasmine.Spy;
  let mockGetDownloadURL: jasmine.Spy;
  let mockDeleteObject: jasmine.Spy;
  let mockUploadString: jasmine.Spy;
  let mockUploadBytesResumable: jasmine.Spy;

  beforeEach(() => {
    jasmine.getEnv().allowRespy(true);

    const firestoreSpy = jasmine.createSpyObj('Firestore', ['app']);
    const storageSpy = jasmine.createSpyObj('Storage', ['app']);

    TestBed.configureTestingModule({
      providers: [
        FirestoreService,
        {provide: Firestore, useValue: firestoreSpy},
        {provide: Storage, useValue: storageSpy}
      ]
    });

    service = TestBed.inject(FirestoreService);
    mockFirestore = TestBed.inject(Firestore) as jasmine.SpyObj<Firestore>;
    mockStorage = TestBed.inject(Storage) as jasmine.SpyObj<Storage>;

    // Setup Firebase function mocks
    setupFirebaseMocks();
  });

  function setupFirebaseMocks() {
    // Mock Firestore functions
    mockDoc = jasmine.createSpy('doc').and.returnValue({id: 'mock-ref'});
    mockCollection = jasmine.createSpy('collection').and.returnValue({id: 'mock-collection'});
    mockSetDoc = jasmine.createSpy('setDoc').and.returnValue(Promise.resolve());
    mockGetDoc = jasmine.createSpy('getDoc').and.returnValue(Promise.resolve({
      exists: () => true,
      id: 'test-id',
      data: () => ({name: 'Test Document'})
    }));
    mockUpdateDoc = jasmine.createSpy('updateDoc').and.returnValue(Promise.resolve());
    mockDeleteDoc = jasmine.createSpy('deleteDoc').and.returnValue(Promise.resolve());
    mockGetDocs = jasmine.createSpy('getDocs').and.returnValue(Promise.resolve({
      docs: [
        {id: '1', data: () => ({name: 'Doc 1'})},
        {id: '2', data: () => ({name: 'Doc 2'})}
      ]
    }));
    mockQuery = jasmine.createSpy('query').and.returnValue({id: 'mock-query'});
    mockWhere = jasmine.createSpy('where').and.returnValue({id: 'mock-where'});
    mockOrderBy = jasmine.createSpy('orderBy').and.returnValue({id: 'mock-orderby'});
    mockLimit = jasmine.createSpy('limit').and.returnValue({id: 'mock-limit'});
    mockOnSnapshot = jasmine.createSpy('onSnapshot').and.callFake((ref: any, callback: any) => {
      setTimeout(() => callback({
        exists: () => true,
        id: 'test-id',
        data: () => ({name: 'Test Document'})
      }), 0);
      return () => {
      }; // unsubscribe function
    });
    mockServerTimestamp = jasmine.createSpy('serverTimestamp').and.returnValue('mock-timestamp');
    mockWriteBatch = jasmine.createSpy('writeBatch').and.returnValue({
      set: jasmine.createSpy('set'),
      update: jasmine.createSpy('update'),
      delete: jasmine.createSpy('delete'),
      commit: jasmine.createSpy('commit').and.returnValue(Promise.resolve())
    });

    // Mock Storage functions
    mockRef = jasmine.createSpy('ref').and.returnValue({id: 'mock-storage-ref'});
    mockUploadBytes = jasmine.createSpy('uploadBytes').and.returnValue(Promise.resolve({}));
    mockGetDownloadURL = jasmine.createSpy('getDownloadURL').and.returnValue(
      Promise.resolve('https://example.com/file.txt')
    );
    mockDeleteObject = jasmine.createSpy('deleteObject').and.returnValue(Promise.resolve());
    mockUploadString = jasmine.createSpy('uploadString').and.returnValue(Promise.resolve({}));
    mockUploadBytesResumable = jasmine.createSpy('uploadBytesResumable').and.returnValue({
      on: jasmine.createSpy('on').and.callFake((event: string, progress: any, error: any, complete: any) => {
        setTimeout(() => progress({bytesTransferred: 50, totalBytes: 100}), 0);
        setTimeout(() => complete(), 10);
      }),
      snapshot: {ref: {}}
    });

    // Replace the Firebase functions in the service
    (service as any).doc = mockDoc;
    (service as any).collection = mockCollection;
    (service as any).setDoc = mockSetDoc;
    (service as any).getDoc = mockGetDoc;
    (service as any).updateDoc = mockUpdateDoc;
    (service as any).deleteDoc = mockDeleteDoc;
    (service as any).getDocs = mockGetDocs;
    (service as any).query = mockQuery;
    (service as any).where = mockWhere;
    (service as any).orderBy = mockOrderBy;
    (service as any).limit = mockLimit;
    (service as any).onSnapshot = mockOnSnapshot;
    (service as any).serverTimestamp = mockServerTimestamp;
    (service as any).writeBatch = mockWriteBatch;
    (service as any).ref = mockRef;
    (service as any).uploadBytes = mockUploadBytes;
    (service as any).getDownloadURL = mockGetDownloadURL;
    (service as any).deleteObject = mockDeleteObject;
    (service as any).uploadString = mockUploadString;
    (service as any).uploadBytesResumable = mockUploadBytesResumable;
  }

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('Document Operations', () => {
    describe('saveDocument', () => {
      beforeEach(() => {
        spyOn(service as any, 'doc').and.returnValue({id: 'mock-ref'});
        spyOn(service as any, 'setDoc').and.returnValue(Promise.resolve());
        spyOn(service as any, 'serverTimestamp').and.returnValue('mock-timestamp');
      });

      it('should save a document with generated ID', (done) => {
        const testData: FirestoreDocument = {
          name: 'Test Document'
        };

        service.saveDocument('test-collection', testData).subscribe({
          next: (docId) => {
            expect(docId).toBeDefined();
            expect(typeof docId).toBe('string');
            done();
          },
          error: done.fail
        });
      });

      it('should save a document with provided ID', (done) => {
        const testData: FirestoreDocument = {
          name: 'Test Document'
        };

        service.saveDocument('test-collection', testData, 'custom-id').subscribe({
          next: (docId) => {
            expect(docId).toBe('custom-id');
            done();
          },
          error: done.fail
        });
      });

      it('should handle save errors', (done) => {
        spyOn(service as any, 'setDoc').and.returnValue(
          Promise.reject(new Error('Save failed'))
        );

        const testData: FirestoreDocument = {
          name: 'Test Document'
        };

        service.saveDocument('test-collection', testData).subscribe({
          next: () => done.fail('Should have failed'),
          error: (error) => {
            expect(error.message).toContain('Failed to save document');
            done();
          }
        });
      });
    });

    describe('getDocument', () => {
      beforeEach(() => {
        spyOn(service as any, 'doc').and.returnValue({id: 'mock-ref'});
      });

      it('should retrieve an existing document', (done) => {
        const mockSnapshot = {
          exists: () => true,
          id: 'test-id',
          data: () => ({name: 'Test Document'})
        };

        spyOn(service as any, 'getDoc').and.returnValue(Promise.resolve(mockSnapshot));

        service.getDocument('test-collection', 'test-id').subscribe({
          next: (doc: any) => {
            expect(doc).toBeDefined();
            expect(doc?.id).toBe('test-id');
            expect((doc as any)?.name).toBe('Test Document');
            done();
          },
          error: done.fail
        });
      });

      it('should return null for non-existent document', (done) => {
        const mockSnapshot = {
          exists: () => false
        };

        spyOn(service as any, 'getDoc').and.returnValue(Promise.resolve(mockSnapshot));

        service.getDocument('test-collection', 'non-existent').subscribe({
          next: (doc) => {
            expect(doc).toBeNull();
            done();
          },
          error: done.fail
        });
      });

      it('should handle get errors', (done) => {
        spyOn(service as any, 'getDoc').and.returnValue(
          Promise.reject(new Error('Get failed'))
        );

        service.getDocument('test-collection', 'test-id').subscribe({
          next: () => done.fail('Should have failed'),
          error: (error) => {
            expect(error.message).toContain('Failed to get document');
            done();
          }
        });
      });
    });

    describe('updateDocument', () => {
      beforeEach(() => {
        spyOn(service as any, 'doc').and.returnValue({id: 'mock-ref'});
        spyOn(service as any, 'serverTimestamp').and.returnValue('mock-timestamp');
      });

      it('should update a document', (done) => {
        spyOn(service as any, 'updateDoc').and.returnValue(Promise.resolve());

        const updateData = {name: 'Updated Name'};

        service.updateDocument('test-collection', 'test-id', updateData).subscribe({
          next: () => {
            done();
          },
          error: done.fail
        });
      });

      it('should handle update errors', (done) => {
        spyOn(service as any, 'updateDoc').and.returnValue(
          Promise.reject(new Error('Update failed'))
        );

        service.updateDocument('test-collection', 'test-id', {name: 'Updated'}).subscribe({
          next: () => done.fail('Should have failed'),
          error: (error) => {
            expect(error.message).toContain('Failed to update document');
            done();
          }
        });
      });
    });

    describe('deleteDocument', () => {
      beforeEach(() => {
        spyOn(service as any, 'doc').and.returnValue({id: 'mock-ref'});
      });

      it('should delete a document', (done) => {
        spyOn(service as any, 'deleteDoc').and.returnValue(Promise.resolve());

        service.deleteDocument('test-collection', 'test-id').subscribe({
          next: () => {
            done();
          },
          error: done.fail
        });
      });

      it('should handle delete errors', (done) => {
        spyOn(service as any, 'deleteDoc').and.returnValue(
          Promise.reject(new Error('Delete failed'))
        );

        service.deleteDocument('test-collection', 'test-id').subscribe({
          next: () => done.fail('Should have failed'),
          error: (error) => {
            expect(error.message).toContain('Failed to delete document');
            done();
          }
        });
      });
    });
  });

  describe('Query Operations', () => {
    describe('queryDocuments', () => {
      beforeEach(() => {
        spyOn(service as any, 'collection').and.returnValue({id: 'mock-collection'});
        spyOn(service as any, 'query').and.returnValue({id: 'mock-query'});
      });

      it('should query documents without filters', (done) => {
        const mockDocs = [
          {id: '1', data: () => ({name: 'Doc 1'})},
          {id: '2', data: () => ({name: 'Doc 2'})}
        ];
        const mockSnapshot = {docs: mockDocs};

        spyOn(service as any, 'getDocs').and.returnValue(Promise.resolve(mockSnapshot));

        service.queryDocuments('test-collection').subscribe({
          next: (docs: any) => {
            expect(docs.length).toBe(2);
            expect(docs[0].id).toBe('1');
            expect(docs[1].id).toBe('2');
            done();
          },
          error: done.fail
        });
      });

      it('should query documents with filters', (done) => {
        const mockDocs = [
          {id: '1', data: () => ({name: 'Doc 1', status: 'active'})}
        ];
        const mockSnapshot = {docs: mockDocs};

        spyOn(service as any, 'where').and.returnValue({id: 'mock-where'});
        spyOn(service as any, 'getDocs').and.returnValue(Promise.resolve(mockSnapshot));

        const filters: [string, any, any][] = [['status', '==', 'active']];

        service.queryDocuments('test-collection', filters).subscribe({
          next: (docs) => {
            expect(docs.length).toBe(1);
            expect((docs[0] as any).status).toBe('active');
            done();
          },
          error: done.fail
        });
      });

      it('should handle query errors', (done) => {
        spyOn(service as any, 'getDocs').and.returnValue(
          Promise.reject(new Error('Query failed'))
        );

        service.queryDocuments('test-collection').subscribe({
          next: () => done.fail('Should have failed'),
          error: (error) => {
            expect(error.message).toContain('Failed to query documents');
            done();
          }
        });
      });
    });
  });

  describe('Storage Operations', () => {
    describe('uploadFile', () => {
      beforeEach(() => {
        spyOn(service as any, 'ref').and.returnValue({id: 'mock-storage-ref'});
      });

      it('should upload a file and return download URL', (done) => {
        const mockFile = new File(['test content'], 'test.txt', {type: 'text/plain'});
        const mockDownloadUrl = 'https://example.com/test.txt';

        spyOn(service as any, 'uploadBytes').and.returnValue(Promise.resolve({}));
        spyOn(service as any, 'getDownloadURL').and.returnValue(Promise.resolve(mockDownloadUrl));

        service.uploadFile('test/path', mockFile).subscribe({
          next: (url) => {
            expect(url).toBe(mockDownloadUrl);
            done();
          },
          error: done.fail
        });
      });

      it('should handle upload errors', (done) => {
        const mockFile = new File(['test content'], 'test.txt');

        spyOn(service as any, 'uploadBytes').and.returnValue(
          Promise.reject(new Error('Upload failed'))
        );

        service.uploadFile('test/path', mockFile).subscribe({
          next: () => done.fail('Should have failed'),
          error: (error) => {
            expect(error.message).toContain('Failed to upload file');
            done();
          }
        });
      });
    });

    describe('deleteFile', () => {
      beforeEach(() => {
        spyOn(service as any, 'ref').and.returnValue({id: 'mock-storage-ref'});
      });

      it('should delete a file', (done) => {
        spyOn(service as any, 'deleteObject').and.returnValue(Promise.resolve());

        service.deleteFile('test/path').subscribe({
          next: () => {
            done();
          },
          error: done.fail
        });
      });

      it('should handle delete file errors', (done) => {
        spyOn(service as any, 'deleteObject').and.returnValue(
          Promise.reject(new Error('Delete failed'))
        );

        service.deleteFile('test/path').subscribe({
          next: () => done.fail('Should have failed'),
          error: (error) => {
            expect(error.message).toContain('Failed to delete file');
            done();
          }
        });
      });
    });

    describe('uploadBase64', () => {
      beforeEach(() => {
        spyOn(service as any, 'ref').and.returnValue({id: 'mock-storage-ref'});
      });

      it('should upload base64 string', (done) => {
        const dataUrl = 'data:text/plain;base64,dGVzdCBjb250ZW50';
        const mockDownloadUrl = 'https://example.com/test.txt';

        spyOn(service as any, 'uploadString').and.returnValue(Promise.resolve({}));
        spyOn(service as any, 'getDownloadURL').and.returnValue(Promise.resolve(mockDownloadUrl));

        service.uploadBase64('test/path', dataUrl).subscribe({
          next: (url) => {
            expect(url).toBe(mockDownloadUrl);
            done();
          },
          error: done.fail
        });
      });
    });
  });

  describe('User Operations', () => {
    describe('saveUserSettings', () => {
      it('should save user settings', (done) => {
        spyOn(service, 'updateDocument').and.returnValue(of(void 0));

        const settings = {theme: 'dark', notifications: true};

        service.saveUserSettings('user-123', settings).subscribe({
          next: () => {
            expect(service.updateDocument).toHaveBeenCalledWith(
              'users', 'user-123', {settings}
            );
            done();
          },
          error: done.fail
        });
      });
    });

    describe('getUserSettings', () => {
      it('should get user settings', (done) => {
        const mockUser = {
          id: 'user-123',
          settings: {theme: 'dark', notifications: true}
        };

        spyOn(service, 'getDocument').and.returnValue(of(mockUser));

        service.getUserSettings('user-123').subscribe({
          next: (settings) => {
            expect(settings).toEqual(mockUser.settings);
            done();
          },
          error: done.fail
        });
      });

      it('should return null if user has no settings', (done) => {
        spyOn(service, 'getDocument').and.returnValue(of({id: 'user-123'}));

        service.getUserSettings('user-123').subscribe({
          next: (settings) => {
            expect(settings).toBeNull();
            done();
          },
          error: done.fail
        });
      });
    });

    describe('createOrUpdateUser', () => {
      it('should create or update a user', (done) => {
        const userData = {name: 'John Doe', email: 'john@example.com'};

        spyOn(service, 'saveDocument').and.returnValue(of('user-123'));

        service.createOrUpdateUser('user-123', userData).subscribe({
          next: () => {
            expect(service.saveDocument).toHaveBeenCalledWith(
              'users',
              {...userData, id: 'user-123'},
              'user-123'
            );
            done();
          },
          error: done.fail
        });
      });
    });
  });

  describe('Real-time Operations', () => {
    describe('listenToDocument', () => {
      it('should listen to document changes', (done) => {
        const mockSnapshot = {
          exists: () => true,
          id: 'test-id',
          data: () => ({name: 'Test Document'})
        };

        spyOn(service as any, 'doc').and.returnValue({id: 'mock-ref'});
        spyOn(service as any, 'onSnapshot').and.callFake(
          (docRef: any, callback: any) => {
            setTimeout(() => callback(mockSnapshot), 0);
            return () => {
            }; // Return unsubscribe function
          }
        );

        service.listenToDocument('test-collection', 'test-id').subscribe({
          next: (doc: any) => {
            expect(doc).toBeDefined();
            expect(doc?.id).toBe('test-id');
            expect((doc as any)?.name).toBe('Test Document');
            done();
          },
          error: done.fail
        });
      });
    });

    describe('listenToCollection', () => {
      it('should listen to collection changes', (done) => {
        const mockDocs = [
          {id: '1', data: () => ({name: 'Doc 1'})},
          {id: '2', data: () => ({name: 'Doc 2'})}
        ];
        const mockSnapshot = {docs: mockDocs};

        spyOn(service as any, 'collection').and.returnValue({id: 'mock-collection'});
        spyOn(service as any, 'query').and.returnValue({id: 'mock-query'});
        spyOn(service as any, 'onSnapshot').and.callFake(
          (query: any, callback: any) => {
            setTimeout(() => callback(mockSnapshot), 0);
            return () => {
            };
          }
        );

        service.listenToCollection('test-collection').subscribe({
          next: (docs: any) => {
            expect(docs.length).toBe(2);
            expect(docs[0].id).toBe('1');
            expect(docs[1].id).toBe('2');
            done();
          },
          error: done.fail
        });
      });
    });
  });

});
