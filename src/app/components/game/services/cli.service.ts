import { Injectable } from '@angular/core';
import { GameConfigService } from './game-config.service';
import {UserService} from './user.service';

export interface CLIResponse {
  output: string;
  status?: number;
  error?: string;
  followUp?: () => void;
}

export interface CLICommand {
  name: string;
  aliases?: string[];
  description: string;
  levelRequired?: number;
  execute: (args: string[]) => CLIResponse;
}



@Injectable({ providedIn: 'root' })
export class CLIService {
  private commands = new Map<string, CLICommand>();

  constructor(private config: GameConfigService, private userService: UserService) {
     this.config.loadLevelsForProgress().then((levels) => {
       levels.subscribe((level) => {
         console.warn('level', level);
       });
       this.registerBuiltins();
     });
  }

  private registerBuiltins() {
    this.registerCommand({
      name: 'help',
      description: 'List available commands',
      execute: () => {
        console.warn('commands', this.commands.keys());
        const commands = '\n ' + Array.from(this.commands.keys()).join('\n ');
        return {
          status: commands ? 200 : 404,
          output: `Available commands: ${commands}`
        };
      }
    });
    this.registerCommand({
      name: 'whoami',
      description: 'Returns user identity',
      execute: () => ({
          status: localStorage.getItem('user') ? 200 : 404,
          output: localStorage.getItem('user') || 'Unknown'
        }
      )
    });
    this.registerCommand({
      name: 'exit',
      aliases: ['quit'],
      description: 'Quit the game.',
      execute: () => {
        return {
          status: -1,
          output: 'Goodbye!'
        };
      },
    });
    this.registerCommand({
        name: 'clear',
        aliases: ['clear'],
        description: 'clear the screen.',
      execute: () => {
          return {
            status: -2,
            output: 'Clearing console!'
          };
        },
      });
    this.registerCommand({
      name: 'leet',
      description: 'Convert text to leet speak',
      execute: (args: string[]) => {
        console.warn('params', args);
        if (!args.length) {
          return {
            status: 400,
            output: 'Usage: leet <text>'
          };
        }
        const [text] = args;
        return {
          status: text ? 200 : 404,
          output: text.replace(/[aeiou]/gi, '3').replace(/[AEIOU]/gi, '3')
        };
      }
    });
    this.registerCommand({
      name: 'ls',
      description: 'List accessible files',
      execute: () => {
        const level = this.config.getCurrentLevel();
        const files = '\n\t' + level.logFiles?.map(f => f.name).join('\n\t');
        return {
          status: files ? 200 : 404,
          output: files || '[no files found]'
        };
      }
    });
    this.registerCommand({
      name: 'cat',
      description: 'View contents of a file',
      aliases: ['view', 'read'],
      execute: (args: string[]) => {
        if (!args[0]) return {
          status: 200,
          output: 'Usage: cat <filename>'
        };
        const content = this.config.getFileContent(args[0]);
        return {
          status: content ? 200 : 404,
          output: content ?? `File not found: ${args[0]}`
        };
      }
    });
    this.registerCommand({
      name: 'su',
      description: 'switch user',
      aliases: ['switch-user', 'user'],
      execute: (args: string[]) => {
        const [username, password] = args;
        if (!username) return {
          status: 400,
          output: 'Usage: su <username> [password]'
        };
        if (username === 'admin' || username === 'root') {
          if (!password) return {
            status: 400,
            output: 'Usage: su <username> [password]'
          };
          const isAuthorized = (password: string) => {
            return password === '1234';
          } // implement secure validation
          if (!isAuthorized) {
            return {
              status: 401,
              output: 'Unauthorized'
            };
          }
          if (this.userService.user.name === 'admin') {
            return {
              status: 400,
              output: `Already logged in as admin.`
            };
          }
          this.userService.updateUser({name: username, level: 2, score: this.userService.user.score + 1});
          return {
            status: 201,
            output: `Switched to user: ${username}`
          };
        }
        this.userService.updateUser({name: username, level: 1, score: 0});
        return {
          status: 201,
          output: `Switched to user: ${username}`
        };
      }
    })
    this.registerCommand({
      name: 'user',
      aliases: ['user'],
      description: 'Get user info.',
      execute: (args: string[]) => {
        const [param, value] = args;
        const username = this.userService.user.name;
        if (!param) return {
          status: 400,
          output: 'Usage: user <param> [value]'
        };
        if (username !== 'admin' && username !== 'root') {
          return {
            status: 401,
            output: 'Unauthorized!'
          };
        } else {
          this.userService.updateUser({[param]: value});
          this.userService.updateUser({name: 'unknown'});
          return {
            status: 200,
            output: `Updated user: ${param} to ${value}`
          };
        }
      },
    })
  }

  getAvailableCommands(currentLevel: number): CLICommand[] {
    return Array.from(this.commands.values()).filter(cmd =>
      cmd.levelRequired == null || cmd.levelRequired <= currentLevel
    );
  }

  registerCommand(command: CLICommand) {
    this.commands.set(command.name, command);
    command.aliases?.forEach(alias => this.commands.set(alias, command));
  }

  executeInput(input: string): CLIResponse {
    const [cmd, ...args] = input.trim().split(/\s+/);
    const available = this.config.getAvailableCommands();
    const command = this.commands.get(cmd);

    if (!command || !available.includes(command.name)) {
      return {
        status: 404,
        output: `Unknown or locked command: ${cmd}`
      };
    }

    return command.execute(args);
  }
}
