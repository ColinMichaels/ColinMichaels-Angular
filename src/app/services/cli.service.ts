import { Injectable } from '@angular/core';
import { GameConfigService } from './game-config.service';
import {UserService} from './user.service';

export interface CLIResponse {
  output: string;
  status?: number;
  error?: string;
  followUp?: () => void;
}

interface CLICommand {
  name: string;
  aliases?: string[];
  description: string;
  execute: (args: string[]) => CLIResponse;
}

@Injectable({ providedIn: 'root' })
export class CLIService {
  private commands = new Map<string, CLICommand>();

  constructor(private config: GameConfigService, private userService: UserService) {
    this.config.loadConfig().then(() => this.registerBuiltins());
  }

  private registerBuiltins() {
    this.registerCommand({
      name: 'help',
      description: 'List available commands',
      execute: () => {
        const commands = '\n ' + this.config.getAvailableCommands().join('\n ');
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
        output: localStorage.getItem('user') || 'Unknown' }
      )
    });

    this.registerCommand({
      name: 'leet',
      description: 'Convert text to leet speak',
      execute: (args: string[]) => {
        const text = args.join(' ');
        return {
          status: text ? 200 : 404,
          output: text.replace(/[aeiou]/gi, '3').replace(/[AEIOU]/gi, '3')
        };
      }
    })

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
      name: 'aichat',
      description: 'Experimental AI ChatBot Service',
      execute: (args: string[]) => {
        return {
          status: 200,
          output: 'aichat > '
        }
      }
    });

    this.registerCommand({
      name: 'su',
      description: 'switch user',
      execute: (args: string[]) => {
        if (!args[0]) return { output: 'Usage: su <username>' };
        const user = args[0];
        if(user === 'admin'){
          if(!args[2] || !args[1] || args[2] !== '1234'){
            return {
              status: 401,
              output: `Unauthorized`
            };
          }
          else if(args[2] === '1234'){
            this.userService.setUserName(user);
            return {
              status: 200,
              output: `Switched to admin: ${user}`
            };
          }
          return {
            status: 401,
            output: `Unauthorized`
          };
        }
        this.userService.resetUser();
        this.userService.setUserName(user);
        return {
          status: 200,
          output: `Switched to user: ${user}`
        };
      }
    })
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
