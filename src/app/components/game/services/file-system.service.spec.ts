import {FILE_TYPE_ICONS, FileSystemService as CanonicalFileSystemService} from '@core-os/filesystem';
import {FileSystemService as LegacyFileSystemService} from './file-system.service';

describe('legacy FileSystemService export', () => {
  it('keeps a compatibility facade without replacing the canonical service', () => {
    expect(Object.is(LegacyFileSystemService, CanonicalFileSystemService)).toBeFalse();
    expect(typeof LegacyFileSystemService.prototype.createFile).toBe('function');
    expect(typeof LegacyFileSystemService.prototype.createFolder).toBe('function');
    expect(typeof LegacyFileSystemService.prototype.createNestedFolders).toBe('function');
  });

  it('retains icon metadata on legacy favorite directories', () => {
    const canonical = {
      getFavoriteDirs: () => [{name: 'Home', path: '/'}],
    } as unknown as CanonicalFileSystemService;
    const legacy = new LegacyFileSystemService(canonical);

    expect(legacy.getFavoriteDirs()).toEqual([{
      name: 'Home',
      path: '/',
      icon: FILE_TYPE_ICONS.find((icon) => icon.name === 'folder'),
    }]);
  });
});
