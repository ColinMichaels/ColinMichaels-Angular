import {FileEntry} from '@core-os/filesystem/file-system.service';
import {FileSystemService} from '@core-os/filesystem/file-system.service';
import {Injectable, inject} from '@angular/core';
import {TerminalAdventure} from '@core-os/terminal/terminal-adventure';

const timestamp = '2026-10-17T00:00:00.000Z';

@Injectable()
export class LostSignalAdventure implements TerminalAdventure {
  private readonly files = inject(FileSystemService);

  async start(): Promise<string> {
    let sameAccount = true;
    const identity = this.files.ready$.subscribe(ready => { if (!ready) sameAccount = false; });
    try {
      const folder = await this.files.installFolder('/Documents', lostSignalFolder());
      if (!sameAccount) throw new Error('The account changed. Start the adventure again.');
      // Add logs to an earlier saved trail without replacing or repairing its clues.
      await this.files.installFolder(folder.path, lostSignalLogs());
      if (!sameAccount) throw new Error('The account changed. Start the adventure again.');
      return folder.path;
    } finally { identity.unsubscribe(); }
  }
}

function entry(id: string, name: string, childrenOrText: FileEntry[] | string): FileEntry {
  const isDir = Array.isArray(childrenOrText);
  return {
    id: `lost-signal-v1-${id}`, name, path: '/', isDir,
    type: isDir ? 'folder' : 'document', created: timestamp, modified: timestamp, tags: [],
    ...(isDir ? {children: childrenOrText as FileEntry[]} : {
      mimeType: 'text/plain', textContent: childrenOrText as string,
    }),
  };
}

// Fictional, local-only game files. Their IDs survive Finder moves and renames.
export function lostSignalFolder(): FileEntry {
  return entry('root', 'Lost Signal', [
    entry('readme', 'README.txt', [
      'LOST SIGNAL — a short recovery exercise',
      '',
      'A message disappeared during the last restart.',
      'Check logs/system.log to find which station lost contact before the restart.',
      'Each station keeps a route.txt maintenance note.',
      '',
      'Use open . to open this folder in Finder.',
      'Try tree, head logs/system.log, or grep -in "relay" logs/system.log.',
      'You can investigate entirely from Terminal or browse the same files in Finder.',
    ].join('\n')),
    lostSignalLogs(),
    entry('station', 'station-7', [
      entry('route', 'route.txt', [
        'Relay maintenance note',
        '',
        'The message is still here, in a folder named .relay.',
        'Names beginning with a dot are hidden from a normal terminal listing.',
        'Use ls -a to see them, then cd .relay and cat message.txt.',
        '',
        'Finder can read the same files. Nothing has left this simulated Mac.',
      ].join('\n')),
      entry('relay', '.relay', [
        entry('message', 'message.txt', [
          'SIGNAL RECOVERED',
          '',
          '“If you can read this, the relay is still alive.”',
          '— the missing operator',
          '',
          'Lost Signal complete. You followed the trail and recovered the message.',
          'This is the end of the first adventure.',
        ].join('\n')),
      ]),
    ]),
  ]);
}

export function lostSignalLogs(): FileEntry {
  return entry('logs', 'logs', [
      entry('system-log', 'system.log', [
        '00:00:01 INFO boot: virtual filesystem mounted',
        '00:00:02 INFO relay station-3: heartbeat received',
        '00:00:03 INFO relay station-7: heartbeat received',
        '00:00:04 WARN relay station-7: contact lost during restart',
        '00:00:05 INFO recovery: maintenance notes retained in each station folder',
      ].join('\n') + '\n'),
      entry('access-log', 'access.log', [
        '23:58 operator read station-7/route.txt',
        '23:59 operator moved message into the local relay archive',
        '00:00 operator disconnected; no outgoing transfer recorded',
      ].join('\n') + '\n'),
    ]);
}
