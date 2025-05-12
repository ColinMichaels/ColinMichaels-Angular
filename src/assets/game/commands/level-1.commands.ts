import {CLICommand} from '../../../app/components/game/services/cli.service';


export default function(): CLICommand[] {
  return [
  {
    name: 'aichat',
    description: 'Experimental AI ChatBot Service',
    execute: (args: string[]) => {
      return {
        status: 200,
        output: 'aichat > '
      }
    }
  }
]};
