import {FileEntry, FileSystemService} from '@core-os/filesystem/file-system.service';
import {parseShellInput} from './shell-input';

export interface TerminalResult {
  output: string;
  clear?: boolean;
  close?: boolean;
  finderPath?: string;
}

const COMMANDS = ['help', 'pwd', 'ls', 'cd', 'cat', 'head', 'tail', 'grep', 'find', 'tree', 'wc', 'echo', 'open', 'whoami', 'clear', 'exit'];
const PIPE_COMMANDS = new Set(['pwd', 'ls', 'cat', 'head', 'tail', 'grep', 'find', 'tree', 'wc', 'echo', 'whoami']);
const OUTPUT_LIMIT = 64_000;

// One session per window, operating entirely on Finder's virtual filesystem.
export class TerminalSession {
  private workingPath = '/';
  private workingId?: string;
  private previousPath = '/';

  constructor(private readonly files: FileSystemService) {}

  get path(): string { this.refreshPath(); return this.workingPath; }
  set path(value: string) {
    this.workingPath = value;
    this.workingId = this.files.getDirectory(value)?.id;
  }

  refreshPath(): void {
    if (!this.workingId || !this.files.isReady()) return;
    const directory = this.files.getEntryById(this.workingId);
    this.workingPath = directory?.isDir ? directory.path : '/';
    this.workingId = directory?.isDir ? directory.id : undefined;
  }

  get prompt(): string {
    return `colin@Macintosh ${this.path === '/' ? '~' : this.path.split('/').pop()} %`;
  }

  resolvePath(value: string): string {
    const expanded = value === '~' ? '/' : value.startsWith('~/') ? value.slice(1) : value;
    const resolved: string[] = [];
    for (const part of (expanded.startsWith('/') ? expanded : `${this.path}/${expanded}`).split('/')) {
      if (part === '..') resolved.pop();
      else if (part && part !== '.') resolved.push(part);
    }
    return `/${resolved.join('/')}`;
  }

  reset(): void { this.path = '/'; this.previousPath = '/'; }

  execute(input: string): TerminalResult {
    try {
      const {pipeline} = parseShellInput(input);
      if (pipeline.length > 1 && pipeline.some(([name]) => !PIPE_COMMANDS.has(name))) {
        throw new Error('zsh: pipes support file-reading and search commands only');
      }
      let result: TerminalResult = {output: ''};
      for (let index = 0; index < pipeline.length; index++) {
        const [command, ...args] = pipeline[index];
        if (!command) continue;
        result = this.run(command, args, index ? result.output : undefined);
        if (result.output.length > OUTPUT_LIMIT) {
          result.output = `${result.output.slice(0, OUTPUT_LIMIT)}\n[Output truncated; narrow your search.]`;
        }
      }
      return result;
    } catch (error) { return {output: error instanceof Error ? error.message : 'The command could not finish.'}; }
  }

  complete(input: string): {input: string; matches: string[]} {
    if (!this.files.isReady()) return {input, matches: []};
    try {
      const parsed = parseShellInput(input, true);
      const words = parsed.pipeline.at(-1)!;
      const word = parsed.currentWord;
      let matches: string[];
      if (words.length <= (parsed.started ? 1 : 0)) {
        matches = [...COMMANDS, 'adventure', 'history'].filter(name => name.startsWith(word));
      } else {
        const slash = word.lastIndexOf('/');
        const prefix = word.slice(0, slash + 1);
        const name = word.slice(slash + 1);
        const folder = this.files.getDirectory(this.resolvePath(prefix || '.'));
        matches = this.files.sortFiles(folder?.children)
          .filter(file => file.name.startsWith(name) && (name.startsWith('.') || !file.name.startsWith('.'))
            && (words[0] !== 'cd' || file.isDir))
          .map(file => prefix + file.name + (file.isDir ? '/' : ''));
      }
      if (!matches.length) return {input, matches};
      let common = matches[0];
      for (const match of matches.slice(1)) {
        while (!match.startsWith(common)) common = common.slice(0, -1);
      }
      const escaped = common.replace(/[\s\\'"|;&<>]/g, '\\$&');
      return {input: input.slice(0, parsed.tokenStart) + escaped, matches};
    } catch { return {input, matches: []}; }
  }

  private run(command: string, args: string[], stdin?: string): TerminalResult {
    if (command === 'help') return {output: [
      'Browse: pwd · ls [-alh] [path] · cd [folder|-] · tree [-a] [folder]',
      'Read: cat <file...> · head/tail [-n count] [file] · wc [-lwc] [file]',
      'Search: find [folder] [-name/-iname "*.txt"] [-type f|d]',
      '        grep [-rinF] <literal text> <file/folder...>',
      'Combine: cat logs/system.log | grep -i relay | tail -n 3',
      'Session: echo <text> · history · whoami · clear · exit · open [folder]',
      'Tab completes commands and paths. Quote spaces; ~ is virtual Home.',
      'adventure adds/resumes the fictional Lost Signal files in Documents.',
      'Supported commands use virtual files only. grep searches literal text;',
      'find supports * and ? name patterns. Pipes pass text between read commands.',
    ].join('\n')};
    if (command === 'clear') return {output: '', clear: true};
    if (command === 'exit') return {output: '', close: true};
    if (command === 'whoami') return {output: 'colin'};
    if (command === 'echo') return {output: args.join(' ') + '\n'};
    if (!this.files.isReady()) throw new Error('Virtual files are unavailable. Sign in and check Finder before trying again.');
    if (!this.files.getDirectory(this.path)) this.reset();
    switch (command) {
      case 'pwd': return {output: this.path};
      case 'ls': return {output: this.list(args)};
      case 'cd': {
        if (args.length > 1) throw new Error('usage: cd [folder|-]');
        const path = args[0] === '-' ? this.previousPath : this.resolvePath(args[0] ?? '~');
        const folder = this.files.getDirectory(path);
        if (!folder) throw new Error(`cd: no such directory: ${args[0]}`);
        this.previousPath = this.path;
        this.path = folder.path;
        return {output: args[0] === '-' ? this.path : ''};
      }
      case 'cat': {
        if (!args.length) {
          if (stdin !== undefined) return {output: stdin};
          throw new Error('usage: cat <file...>');
        }
        return {output: args.map(path => this.readText(path)).join('\n')};
      }
      case 'head': case 'tail': return {output: this.edgeLines(command, args, stdin)};
      case 'grep': return {output: this.grep(args, stdin)};
      case 'find': return {output: this.find(args)};
      case 'tree': return {output: this.tree(args)};
      case 'wc': {
        const {flags, operands} = this.options(args, 'lwc');
        if (operands.length > 1) throw new Error('usage: wc [-lwc] [file]');
        const text = this.source(operands[0], stdin, 'wc');
        const counts = [
          ...(!flags || flags.includes('l') ? [(text.match(/\n/g) ?? []).length] : []),
          ...(!flags || flags.includes('w') ? [text.trim() ? text.trim().split(/\s+/).length : 0] : []),
          ...(!flags || flags.includes('c') ? [new TextEncoder().encode(text).length] : []),
        ];
        return {output: counts.join(' ') + (operands[0] ? ` ${operands[0]}` : '') + '\n'};
      }
      case 'open': {
        if (args.length > 1) throw new Error('usage: open [folder]');
        const folder = this.files.getDirectory(this.resolvePath(args[0] ?? '.'));
        if (!folder) throw new Error('open: no such directory; use cat to read a text file');
        return {output: `Opened ${folder.path} in Finder.`, finderPath: folder.path};
      }
      default: throw new Error(`zsh: command not found: ${command}. Type help for available commands.`);
    }
  }

  private list(args: string[]): string {
    const {flags, operands} = this.options(args, 'alh');
    if (operands.length > 1) throw new Error('usage: ls [-alh] [path]');
    const entry = this.requireEntry(operands[0] ?? '.', 'ls');
    const entries = entry.isDir ? this.files.sortFiles(entry.children) : [entry];
    return entries.filter(file => !entry.isDir || flags.includes('a') || !file.name.startsWith('.')).map(file => {
      const name = file.name + (file.isDir ? '/' : '');
      if (!flags.includes('l')) return name;
      const size = file.textContent !== undefined ? new TextEncoder().encode(file.textContent).length : file.size;
      const label = size === undefined ? '-' : flags.includes('h') && size >= 1024 ? `${(size / 1024).toFixed(1)}K` : String(size);
      return `${file.isDir ? 'd' : '-'}r-xr-xr-x  colin staff ${label.padStart(6)}  ${file.modified.slice(0, 10)}  ${name}`;
    }).join('\n');
  }

  private find(args: string[]): string {
    let root = '.';
    if (args[0] && !args[0].startsWith('-')) root = args.shift()!;
    let pattern: string | undefined;
    let insensitive = false;
    let type = '';
    for (let index = 0; index < args.length; index += 2) {
      const option = args[index], value = args[index + 1];
      if (!value) throw new Error('usage: find [folder] [-name/-iname pattern] [-type f|d]');
      if (option === '-name' || option === '-iname') { pattern = value; insensitive = option === '-iname'; }
      else if (option === '-type' && ['f', 'd'].includes(value)) type = value;
      else throw new Error(`find: unsupported option: ${option}`);
    }
    const matcher = pattern === undefined ? undefined : this.namePattern(pattern, insensitive);
    return this.walk(this.requireEntry(root, 'find')).filter(file => (!matcher || matcher.test(file.name))
      && (!type || (type === 'd') === file.isDir)).map(file => file.path).join('\n');
  }

  private tree(args: string[]): string {
    const {flags, operands} = this.options(args, 'a');
    if (operands.length > 1) throw new Error('usage: tree [-a] [folder]');
    const root = this.requireEntry(operands[0] ?? '.', 'tree');
    if (!root.isDir) throw new Error('tree: not a directory');
    const lines = [root.path];
    const visit = (folder: FileEntry, prefix: string) => {
      const entries = this.files.sortFiles(folder.children).filter(file => flags.includes('a') || !file.name.startsWith('.'));
      entries.forEach((file, index) => {
        const last = index === entries.length - 1;
        lines.push(`${prefix}${last ? '└── ' : '├── '}${file.name}${file.isDir ? '/' : ''}`);
        if (file.isDir) visit(file, prefix + (last ? '    ' : '│   '));
      });
    };
    visit(root, '');
    return lines.join('\n');
  }

  private grep(args: string[], stdin?: string): string {
    const {flags, operands} = this.options(args, 'rinF');
    const [pattern, ...paths] = operands;
    if (pattern === undefined || (!paths.length && stdin === undefined)) throw new Error('usage: grep [-rinF] <literal text> <file/folder...>');
    const matches: string[] = [];
    const inspect = (text: string, path?: string) => {
      this.lines(text).forEach((line, index) => {
        const value = line.replace(/\n$/, '');
        if ((flags.includes('i') ? value.toLowerCase() : value).includes(flags.includes('i') ? pattern.toLowerCase() : pattern)) {
          matches.push(`${path ? path + ':' : ''}${flags.includes('n') ? index + 1 + ':' : ''}${value}`);
        }
      });
    };
    if (!paths.length) inspect(stdin!);
    for (const path of paths) {
      const root = this.requireEntry(path, 'grep');
      if (root.isDir && !flags.includes('r')) throw new Error(`grep: ${path}: Is a directory (use -r)`);
      for (const file of root.isDir ? this.walk(root) : [root]) {
        if (!file.isDir && file.textContent !== undefined) inspect(file.textContent, root.isDir || paths.length > 1 ? file.path : undefined);
        else if (!file.isDir && !root.isDir) throw new Error(`grep: ${path}: No text contents attached`);
      }
    }
    return matches.length ? matches.join('\n') + '\n' : '';
  }

  private edgeLines(command: 'head' | 'tail', args: string[], stdin?: string): string {
    let count = 10;
    if (args[0] === '-n') {
      if (!/^\d+$/.test(args[1] ?? '')) throw new Error(`${command}: -n requires a nonnegative line count`);
      count = Math.min(Number(args[1]), 100_000); args = args.slice(2);
    }
    if (args.length > 1 || args[0]?.startsWith('-')) throw new Error(`usage: ${command} [-n count] [file]`);
    const lines = this.lines(this.source(args[0], stdin, command));
    return (command === 'head' ? lines.slice(0, count) : count ? lines.slice(-count) : []).join('');
  }

  private options(args: string[], allowed: string): {flags: string; operands: string[]} {
    let flags = '';
    const operands: string[] = [];
    let literal = false;
    for (const arg of args) {
      if (!literal && arg === '--') literal = true;
      else if (!literal && arg.startsWith('-') && arg !== '-') {
        if ([...arg.slice(1)].some(flag => !allowed.includes(flag))) throw new Error(`unsupported option: ${arg}`);
        flags += arg.slice(1);
      } else operands.push(arg);
    }
    return {flags, operands};
  }

  private source(path: string | undefined, stdin: string | undefined, command: string): string {
    if (path !== undefined) return this.readText(path);
    if (stdin !== undefined) return stdin;
    throw new Error(`usage: ${command} [file] (or pipe text into ${command})`);
  }

  private requireEntry(path: string, command: string): FileEntry {
    const entry = this.files.getEntry(this.resolvePath(path));
    if (!entry) throw new Error(`${command}: ${path}: No such file or directory`);
    return entry;
  }

  private readText(path: string): string {
    const file = this.requireEntry(path, 'cat');
    if (file.isDir) throw new Error(`cat: ${path}: Is a directory`);
    if (file.textContent === undefined) throw new Error(`cat: ${path}: This virtual file has no text contents attached.`);
    return file.textContent;
  }

  private lines(text: string): string[] { return text.match(/[^\n]*\n|[^\n]+$/g) ?? []; }

  private walk(root: FileEntry): FileEntry[] {
    return [root, ...(root.children ?? []).flatMap(child => this.walk(child))];
  }

  private namePattern(pattern: string, insensitive: boolean): RegExp {
    const escaped = [...pattern].map(char => char === '*' ? '.*' : char === '?' ? '.' : char.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('');
    return new RegExp(`^${escaped}$`, insensitive ? 'i' : '');
  }
}
