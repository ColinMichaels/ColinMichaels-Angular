import {HttpClient} from '@angular/common/http';
import {of} from 'rxjs';
import {FileEntry, FileSystemService} from './file-system.service';

function createBaseTree(): FileEntry {
  return {
    name: '/',
    path: '/',
    type: 'folder',
    isDir: true,
    created: '2026-01-01T00:00:00.000Z',
    modified: '2026-01-01T00:00:00.000Z',
    children: [
      {
        name: 'Photos',
        path: '/Photos',
        type: 'folder',
        isDir: true,
        created: '2026-01-01T00:00:00.000Z',
        modified: '2026-01-01T00:00:00.000Z',
        children: []
      },
      {
        name: 'resume.pdf',
        path: '/resume.pdf',
        type: 'document',
        isDir: false,
        created: '2026-01-01T00:00:00.000Z',
        modified: '2026-01-01T00:00:00.000Z'
      }
    ]
  };
}

function createService(): FileSystemService {
  const httpMock = jasmine.createSpyObj<Pick<HttpClient, 'get'>>('HttpClient', ['get']);
  httpMock.get.and.returnValue(of(createBaseTree()));
  return new FileSystemService(httpMock as unknown as HttpClient);
}

describe('FileSystemService', () => {
  it('adds favorite directories without adding duplicate root entries', () => {
    const service = createService();
    const root = service.getCurrentDirectory();
    const rootChildren = root.children ?? [];

    const rootPathCount = rootChildren.filter((entry) => entry.path === '/').length;
    expect(rootPathCount).toBe(0);

    const desktopEntry = rootChildren.find((entry) => entry.path === '/Desktop');
    expect(desktopEntry).toBeDefined();
    expect(desktopEntry?.isDir).toBeTrue();
  });

  it('generates deterministic favorite folder content across service instances', () => {
    const firstService = createService();
    const secondService = createService();

    const firstDesktop = firstService.getCurrentDirectory().children?.find((entry) => entry.path === '/Desktop');
    const secondDesktop = secondService.getCurrentDirectory().children?.find((entry) => entry.path === '/Desktop');

    expect(firstDesktop?.children?.map((entry) => entry.name)).toEqual(
      secondDesktop?.children?.map((entry) => entry.name)
    );
  });

  it('navigates to generated favorite folders successfully', () => {
    const service = createService();

    expect(service.navigateTo('/Desktop')).toBeTrue();
    const current = service.getCurrentDirectory();
    expect(current.path).toBe('/Desktop');
    expect((current.children ?? []).length).toBeGreaterThan(0);
  });
});
