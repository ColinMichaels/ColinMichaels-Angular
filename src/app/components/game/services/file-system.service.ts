import {Injectable} from '@angular/core';
import {BehaviorSubject} from 'rxjs';
import {HttpClient} from '@angular/common/http';
import {IconDefinition, IconType, MediaItem} from './media.service';
import {faker} from '@faker-js/faker';

export interface FileEntry {
  name: string;
  type: string; // matches FileTypeIcon.type
  path: string;
  isDir: boolean;
  created: string;
  modified: string;
  media?: MediaItem;
  children?: FileEntry[];
}

export interface FileTypeIcon extends IconDefinition {
  type: IconType;
  ext: string;
  label: string;
  icon: string;
}

export const FILE_TYPE_ICONS: FileTypeIcon[] = [
  {name: 'folder', type: 'custom', ext: 'folder', label: 'Folder', icon: '📁'},
  {name: 'image', type: 'custom', ext: 'image', label: 'Image', icon: '🖼️'},
  {name: 'video', type: 'custom', ext: 'video', label: 'Video', icon: '🎬'},
  {name: 'audio', type: 'custom', ext: 'audio', label: 'Audio', icon: '🎵'},
  {name: 'document', type: 'custom', ext: 'document', label: 'Document', icon: '📄'},
  {name: 'code', type: 'custom', ext: 'code', label: 'Code', icon: '💻'},
  {name: 'archive', type: 'custom', ext: 'archive', label: 'Archive', icon: '🗜️'},
  {name: 'app', type: 'custom', ext: 'app', label: 'Application', icon: '🧩'},
];

@Injectable({providedIn: 'root'})
export class FileSystemService {
  private root: FileEntry = {
    name: '/',
    path: '/',
    created: Date().toString(),
    modified: Date().toString(),
    type: 'folder',
    isDir: true,
    children: []
  };

  private favoriteDirs = [
    {name: 'Home', path: '/', icon: this.getIconForType('folder')},
    {name: 'Desktop', path: '/Desktop', icon: this.getIconForType('folder')},
    {name: 'Downloads', path: '/Downloads', icon: this.getIconForType('folder')},
    {name: 'Music', path: '/Music', icon: this.getIconForType('folder')},
    {name: 'Sites', path: '/Sites', icon: this.getIconForType('folder')},
    {name: 'Projects', path: '/Projects', icon: this.getIconForType('folder')},
    {name: 'Documents', path: '/Documents', icon: this.getIconForType('folder')},
    {name: 'Photos', path: '/Photos', icon: this.getIconForType('folder')},
    {name: 'Videos', path: '/Videos', icon: this.getIconForType('folder')},
    {name: 'Downloads', path: '/Downloads', icon: this.getIconForType('folder')},
    {name: 'Music', path: '/Music', icon: this.getIconForType('folder')},
    {name: 'Recents', path: '/Recents', icon: this.getIconForType('folder')}
  ];

  private getIconForType(type: string): IconDefinition | undefined {
    return FILE_TYPE_ICONS.find(i => i.name === type);
  }

  sortBy: 'name' | 'type' | 'modified' = 'name';

  private currentDirSubject = new BehaviorSubject<FileEntry>(this.root);
  public currentDir$ = this.currentDirSubject.asObservable();

  public viewMode: 'list' | 'grid' | 'columns' = 'list';

  constructor(private http: HttpClient) {
    this.loadFromAssets();
  }


  sortFiles(files: FileEntry[] | undefined): FileEntry[] | undefined {
    return files ? [...files].sort((a, b) => {
      switch (this.sortBy) {
        case 'name':
          return a.name.localeCompare(b.name);
        case 'type':
          return (a.type || '').localeCompare(b.type || '');
        case 'modified':
          return new Date(b.modified).getTime() - new Date(a.modified).getTime();
        default:
          return 0;
      }
    }) : [];
  }

  getCurrentDirectory(): FileEntry {
    return this.currentDirSubject.getValue();
  }

  getFavoriteDirs() {
    return this.favoriteDirs;
  }

  navigateTo(path: string): boolean {
    const target = this.findByPath(path, this.root);
    if (target?.isDir) {
      this.currentDirSubject.next(target);
      return true;
    }
    return false;
  }

  private findByPath(path: string, node: FileEntry): FileEntry | undefined {
    if (node.path === path) return node;
    if (node.children) {
      for (const child of node.children) {
        const found = this.findByPath(path, child);
        if (found) return found;
      }
    }
    return undefined;
  }

  private inferFileType(filename: string): string {
    const extension = filename.split('.').pop()?.toLowerCase();
    switch (extension) {
      case 'jpg':
      case 'jpeg':
      case 'png':
      case 'gif':
        return 'image';
      case 'mp3':
      case 'wav':
        return 'audio';
      case 'mp4':
      case 'mov':
        return 'video';
      case 'zip':
      case 'rar':
      case '7z':
        return 'archive';
      case 'js':
      case 'ts':
      case 'html':
      case 'css':
      case 'json':
        return 'code';
      case 'md':
      case 'txt':
      case 'pdf':
        return 'document';
      default:
        return 'document';
    }
  }

  private assignTypesRecursively(node: FileEntry): void {
    if (!node.isDir) {
      node.type = this.inferFileType(node.name);
    } else if (node.children) {
      node.type = 'folder';
      node.children.forEach(child => this.assignTypesRecursively(child));
    }
  }

  private loadFromAssets() {
    this.http.get<FileEntry>('/assets/files.json').subscribe((tree) => {
      this.assignTypesRecursively(tree);

      const favorites = (this.favoriteDirs ?? [])
        .map(dir => this.createFolder(dir.name, dir.path)!)
        .filter((folder): folder is FileEntry => folder !== undefined)
        .map(folder => {
          folder.children = this.createNestedFolders(folder.name, folder.path, faker.number.int({min: 1, max: 5}), true).children;
          return folder;
        });

      tree.children = this.mergeFolders(tree.children ?? [], favorites);

      this.root = tree;
      this.currentDirSubject.next(this.root);
    });
  }

  // New helper method to filter and merge folders
  private mergeFolders(existing: FileEntry[], newFolders: FileEntry[]): FileEntry[] {
    const existingPaths = new Set(existing.map(folder => folder.path));
    const uniqueNewFolders = newFolders.filter(folder => !existingPaths.has(folder.path));
    return [...uniqueNewFolders, ...existing];
  }

  createMockFilesForFolder(folder: FileEntry, numFiles = 1) {
    const files: FileEntry[] = Array.isArray(folder.children) ? folder.children : [];

    for (let i = 0; i < numFiles; i++) {
      const file = this.createFile(faker.system.fileName(), folder.path + '/' + faker.system.fileName() + '.' + faker.system.commonFileType());
      if (file) {
        files.push(file);
      }
    }
    return files;
  }


  createFile(name: string, path: string): FileEntry | undefined {
    return {
      name,
      path: `${path}`,
      created: Date().toString(),
      modified: Date().toString(),
      type: 'document',
      isDir: false
    }
  }

  createFolder(name: string, path: string, withFiles = true): FileEntry {
    if (!name || !path.trim()) {
      throw new Error('Name and path are required.');
    }

    return {
      name: faker.name.jobType(),
      path: `${path}`.replace(/\/+/g, '/'), // Normalize the path
      created: new Date().toISOString(),
      modified: new Date().toISOString(),
      type: 'folder',
      isDir: true,
      children: withFiles ? this.createMockFilesForFolder({
        name,
        path,
        type: 'folder',
        isDir: true
      } as FileEntry, faker.number.int({min: 1, max: 5})) : []
    };
  }

  createNestedFolders(name: string, path: string, depth: number = 3, withFiles = true): FileEntry {
    if (depth <= 0) {
      // Base case: return a folder without children or nested folders
      return this.createFolder(name, path, withFiles);
    }

  // Normalize the parent folder path and create the folder
  const folderPath = `${path.replace(/\/+$/, '')}/${name}`;
  const folder: FileEntry = this.createFolder(name, path, false);

  // Create a set to track existing children paths and ensure no duplicates
  const childPaths = new Set<string>();

  // Generate a random number of subfolders
  const numSubfolders = faker.number.int({ min: 1, max: 3 });
  folder.children = [];

  for (let i = 0; i < numSubfolders; i++) {
    const subfolderName = faker.system.fileName();
    const subfolderPath = `${folderPath}/${subfolderName}`;

    // Check if this subfolder path was already added
    if (childPaths.has(subfolderPath)) {
      continue; // Skip duplicates
    }

    // Add the subfolder and register its path
    folder.children.push(this.createNestedFolders(subfolderName, folderPath, depth - 1, withFiles));
    childPaths.add(subfolderPath);
  }

  // Optionally add random files to the folder
  if (withFiles) {
    const files = this.createMockFilesForFolder(folder, faker.number.int({ min: 1, max: 5 }));

    for (const file of files) {
      // Check if the file path is already in the set before adding
      if (!childPaths.has(file.path)) {
        folder.children.push(file);
        childPaths.add(file.path);
      }
    }
  }

  return folder;
}
}
