import {faCss} from '@fortawesome/free-brands-svg-icons';
import {faFaceGrin} from '@fortawesome/free-regular-svg-icons';
import {
  faChartSimple,
  faCircleInfo,
  faCloudSunRain,
  faCogs,
  faComputer,
  faHexagonNodesBolt,
  faIcons,
  faKeyboard,
  faMessage,
  faMusic,
  faNoteSticky,
  faPerson,
  faRocket
} from '@fortawesome/free-solid-svg-icons';
import {ChatBotComponent} from '../../modules/chat/chat.component';
import {AboutAppComponent} from '../../components/game/apps/about-app/about-app.component';
import {ActivityMonitorComponent} from '../../components/game/apps/activity-monitor/activity-monitor.component';
import {CliGameComponent} from '../../components/game/apps/cli-game/cli-game.component';
import {IconPlaygroundComponent} from '../../components/game/apps/icon-playground/icon-playground.component';
import {MarkdownReaderComponent} from '../../components/game/apps/markdown-reader/markdown-reader.component';
import {MessagesComponent} from '../../components/game/apps/messages/messages.component';
import {PatchEditorComponent} from '../../components/game/apps/music-apps/patch-editor/patch-editor.component';
import {PianoComponent} from '../../components/game/apps/music-apps/piano/piano.component';
import {MusicPlayerComponent} from '../../components/game/apps/music-player/music-player.component';
import {
  PlayerConfiguratorComponent
} from '../../components/game/apps/player-configurator/player-configurator.component';
import {SpaceXComponent} from '../../components/game/apps/space-x/space-x.component';
import {TailwindPreviewComponent} from '../../components/game/apps/tailwind-preview/tailwind-preview.component';
import {TaskAppComponent} from '../../components/game/apps/task-app/task-app.component';
import {TooltipExamplesComponent} from '../../components/game/apps/tooltip-examples/tooltip-examples.component';
import {WeatherComponent} from '../../components/game/apps/weather/weather.component';
import {FinderAppComponent} from '../../components/game/system/finder-app/finder-app.component';
import {SettingsPanelComponent} from '../../components/game/system/settings-panel/settings-panel.component';
import {APP_ID, AppEntry, AppType} from './application-manager.models';

function createDevelopmentMetadata(): NonNullable<AppEntry['metadata']> {
  return {
    version: '0.0.1',
    author: '<NAME>',
    license: 'MIT',
    website: 'https://github.com/colinmichaels'
  };
}

export function getDefaultApplicationCatalog(): AppEntry[] {
  return [
    {
      id: APP_ID.player_config,
      title: 'Player Config',
      component: PlayerConfiguratorComponent,
      installed: true,
      icon: {
        class: 'text-[22px] gradient--bg-green py-0.5 px-2 rounded-lg shadow-lg border-2 border-blue-800 text-black',
        svgPath: faPerson
      },
      memory: 1024,
      maxInstances: 1,
      type: AppType.app,
      instanceIndex: 0
    },
    {
      id: APP_ID.tooltip_example,
      title: 'Tooltip Example',
      component: TooltipExamplesComponent,
      installed: true,
      icon: {
        class: 'text-teal-500/80 text-[20px] p-0.5 rounded-lg inner-shadow border-2 border-zinc-700',
        svgPath: faCogs
      },
      memory: 512,
      maxInstances: 1,
      type: AppType.app,
      instanceIndex: 0
    },
    {
      id: APP_ID.tasks_app,
      title: 'Tasks',
      component: TaskAppComponent,
      installed: true,
      autofit: true,
      icon: {
        class: 'text-white/80 text-[20px] p-0.5 rounded-lg inner-shadow border-2 border-zinc-700',
        svgPath: faNoteSticky
      },
      memory: 512,
      maxInstances: 1,
      type: AppType.app,
      instanceIndex: 0
    },
    {
      id: APP_ID.music_player,
      title: 'Music',
      component: MusicPlayerComponent,
      installed: true,
      windowSize: {height: 400, width: 200},
      autofit: true,
      icon: {
        class: 'text-white bg-red-600 text-[18px] p-1 rounded-lg inner-shadow border-2 border-zinc-700',
        svgPath: faMusic
      },
      memory: 512,
      maxInstances: 1,
      type: AppType.app,
      instanceIndex: 0,
      status: 'development',
      metadata: createDevelopmentMetadata()
    },
    {
      id: APP_ID.weather_app,
      title: 'Weather',
      component: WeatherComponent,
      installed: true,
      windowSize: {height: 600, width: 800},
      autofit: true,
      icon: {
        class: 'text-blue-900 bg-blue-400 text-[18px] p-1 rounded-lg inner-shadow border-2 border-zinc-700',
        svgPath: faCloudSunRain
      },
      memory: 512,
      maxInstances: 1,
      type: AppType.app,
      instanceIndex: 0,
      status: 'development',
      metadata: createDevelopmentMetadata()
    },
    {
      id: APP_ID.music_piano,
      title: 'Piano',
      component: PianoComponent,
      installed: true,
      windowSize: {height: 400, width: 1000},
      autofit: true,
      icon: {
        class: 'text-white bg-red-600 text-[18px] p-1 rounded-lg inner-shadow border-2 border-zinc-700',
        svgPath: faKeyboard
      },
      memory: 512,
      maxInstances: 1,
      type: AppType.app,
      instanceIndex: 0,
      status: 'development',
      metadata: createDevelopmentMetadata()
    },
    {
      id: APP_ID.music_patch_editor,
      title: 'Patch Editor',
      component: PatchEditorComponent,
      installed: true,
      windowSize: {height: 600, width: 600},
      autofit: false,
      icon: {
        class: 'text-black bg-yellow-600 text-[18px] p-1 rounded-lg inner-shadow border-2 border-zinc-700',
        svgPath: faHexagonNodesBolt
      },
      memory: 512,
      maxInstances: 1,
      type: AppType.app,
      instanceIndex: 0,
      status: 'development',
      metadata: createDevelopmentMetadata()
    },
    {
      id: APP_ID.space_x_app,
      title: 'Space X Launches',
      component: SpaceXComponent,
      installed: true,
      windowSize: {height: 800, width: 600},
      autofit: false,
      icon: {
        class: 'text-white p-1 rounded-lg border-2 border-zinc-700',
        svgPath: faRocket
      },
      memory: 512,
      maxInstances: 1,
      type: AppType.app,
      instanceIndex: 0,
      status: 'development',
      metadata: createDevelopmentMetadata()
    },
    {
      id: APP_ID.messages_app,
      title: 'Messages',
      component: MessagesComponent,
      installed: true,
      windowSize: {height: 800, width: 600},
      autofit: false,
      icon: {
        class: 'text-white p-1 rounded-lg border-2 border-zinc-700',
        svgPath: faMessage
      },
      memory: 512,
      maxInstances: 1,
      type: AppType.app,
      instanceIndex: 0
    },
    {
      id: APP_ID.chat_bot,
      title: 'Chat',
      component: ChatBotComponent,
      installed: true,
      windowSize: {height: 800, width: 600},
      autofit: false,
      icon: {
        class: 'text-white p-1 rounded-lg border-2 border-zinc-700',
        svgPath: faMessage
      },
      memory: 512,
      maxInstances: 1,
      type: AppType.app,
      instanceIndex: 0
    },
    {
      id: APP_ID.markdown_reader,
      title: 'Markdown Reader',
      component: MarkdownReaderComponent,
      installed: true,
      icon: {
        class: '',
        svgPath: faCogs
      },
      memory: 512,
      maxInstances: 10,
      type: AppType.system,
      params: {file: 'colinos-demo.doc.md'},
      instanceIndex: 0
    },
    {
      id: APP_ID.tailwind_preview,
      title: 'Tailwind Playground',
      component: TailwindPreviewComponent,
      installed: true,
      icon: {
        class: 'text-white/80 text-[20px] py-1 px-1.5 rounded-lg border-2 border-zinc-700',
        svgPath: faCss
      },
      memory: 512,
      maxInstances: 1,
      type: AppType.app,
      instanceIndex: 0,
      status: 'development',
      metadata: createDevelopmentMetadata()
    },
    {
      id: APP_ID.icon_playground,
      title: 'Icon Playground',
      component: IconPlaygroundComponent,
      installed: true,
      icon: {
        class: 'bg-purple-500 text-black/80 p-1 text-[18px] rounded-lg shadow-lg border-2 border-purple-700',
        svgPath: faIcons
      },
      memory: 512,
      maxInstances: 1,
      type: AppType.app,
      instanceIndex: 0
    },
    {
      id: APP_ID.activity_monitor,
      title: 'Activity Monitor',
      component: ActivityMonitorComponent,
      installed: true,
      icon: {
        class: 'bg-zinc-900 text-sm p-2 rounded-sm shadow-sm border-2 border-zinc-700 text-green-500',
        svgPath: faChartSimple
      },
      memory: 512,
      maxInstances: 1,
      type: AppType.system,
      instanceIndex: 0
    },
    {
      id: APP_ID.cli,
      title: 'cli Console',
      component: CliGameComponent,
      installed: true,
      icon: {
        class: 'bg-zinc-900 text-green-500 rounded p-1 shadow-lg border-2 border-zinc-500 text-base',
        svgPath: faComputer
      },
      memory: 1024,
      maxInstances: 5,
      type: AppType.system,
      instanceIndex: 0
    },
    {
      id: APP_ID.finder,
      title: 'Finder',
      component: FinderAppComponent,
      installed: true,
      icon: {
        class: 'text-[20px] gradient--bg-blue p-1 rounded shadow-lg border-2 border-zinc-600 text-black',
        svgPath: faFaceGrin
      },
      memory: 512,
      maxInstances: 5,
      type: AppType.system,
      instanceIndex: 0
    },
    {
      id: APP_ID.system_settings,
      title: 'System Settings',
      component: SettingsPanelComponent,
      installed: true,
      icon: {
        class: 'text-white/80 text-[20px] p-0.5 rounded-lg inner-shadow border-2 border-zinc-700 text-zinc-800',
        svgPath: faCogs
      },
      memory: 512,
      maxInstances: 1,
      type: AppType.system,
      instanceIndex: 0
    },
    {
      id: APP_ID.about,
      title: 'About',
      component: AboutAppComponent,
      installed: true,
      icon: {
        class: 'p-2 text-[32px]',
        svgPath: faCircleInfo
      },
      autofit: true,
      memory: 128,
      maxInstances: 1,
      type: AppType.system,
      instanceIndex: 0
    }
  ];
}
