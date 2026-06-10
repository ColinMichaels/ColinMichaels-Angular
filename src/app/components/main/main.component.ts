import {DatePipe, NgClass} from '@angular/common';
import {Component, OnInit, ChangeDetectionStrategy, inject} from '@angular/core';
import {toSignal} from '@angular/core/rxjs-interop';
import {RouterLink} from '@angular/router';
import {map} from 'rxjs';

import {PATH_NAMES} from '../../app-route-paths';
import {BlogShareActionsComponent} from '../../features/blog/components/share-actions/blog-share-actions.component';
import {BlogRepositoryService} from '../../features/blog/services/blog-repository.service';
import {SocialsComponent} from './socials/socials.component';
import {NotificationService} from '../game/services/notification.service';
import {User, UserService} from '../game/services/user.service';
import {HomeTerminalWindowComponent} from './home-terminal-window/home-terminal-window.component';
import {HOME_NOTIFY_CLASSES} from './main.constants';

interface HomeNavItem {
  label: string;
  sectionId: string;
}

interface HomeHighlight {
  eyebrow: string;
  title: string;
  description: string;
  route: string;
  action: string;
  accentClass: string;
}

interface HomeCapability {
  title: string;
  description: string;
  meta: string;
}

interface HomeStat {
  value: string;
  label: string;
}

@Component({
  selector: 'app-main',
  imports: [
    BlogShareActionsComponent,
    DatePipe,
    HomeTerminalWindowComponent,
    NgClass,
    RouterLink,
    SocialsComponent,
  ],
  templateUrl: './main.component.html',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrl: `./home-page.scss`
})
export class MainComponent implements OnInit {
  private readonly notificationService = inject(NotificationService);
  private readonly userService = inject(UserService);
  private readonly blogRepository = inject(BlogRepositoryService);

  user = new User();

  protected readonly navItems: readonly HomeNavItem[] = [
    {label: 'Work', sectionId: 'work'},
    {label: 'Blog', sectionId: 'blog'},
    {label: 'Labs', sectionId: 'labs'},
  ];

  protected readonly stats: readonly HomeStat[] = [
    {value: 'Angular', label: 'Primary UI stack'},
    {value: 'Firebase', label: 'App platform'},
    {value: 'Editor.js', label: 'CMS foundation'},
  ];

  protected readonly capabilities: readonly HomeCapability[] = [
    {
      title: 'Public Website',
      description: 'Portfolio, publishing, media, and project context organized for quick scanning.',
      meta: 'Home / Blog / Work',
    },
    {
      title: 'Core OS Framework',
      description: 'Reusable desktop, window, dock, terminal, tooltip, and command systems.',
      meta: 'Protected OS routes',
    },
    {
      title: 'Labs',
      description: 'Experimental interaction and visual systems kept separate from production pages.',
      meta: 'Route-backed experiments',
    },
  ];

  protected readonly labItems: readonly HomeHighlight[] = [
    {
      eyebrow: 'Visual Lab',
      title: 'Full Screen Backgrounds',
      description: 'Image, video, overlay, and parallax background experiments for immersive interfaces.',
      route: `/${PATH_NAMES.FS_BACKGROUND}`,
      action: 'View background lab',
      accentClass: 'border-sky-400/70 text-sky-200',
    },
    {
      eyebrow: 'Project Demos',
      title: 'Homepage Experiments',
      description: 'SpaceX, weather, patch builder, task, tooltip, and Tailwind demos now belong with labs.',
      route: `/${PATH_NAMES.LABS}`,
      action: 'Browse labs',
      accentClass: 'border-amber-400/70 text-amber-200',
    },
  ];

  protected readonly publishedPosts = toSignal(
    this.blogRepository.getPublishedPosts$().pipe(map(posts => posts.slice(0, 3))),
    {initialValue: []}
  );
  protected readonly blogIsLoading = toSignal(this.blogRepository.loading$, {initialValue: true});
  protected readonly blogLoadError = toSignal(this.blogRepository.error$, {initialValue: null});
  protected readonly pathNames = PATH_NAMES;

  constructor() {
    this.user = this.userService.user;
  }

  ngOnInit(): void {
    if (this.user?.name !== '') {
      this.notificationService.show({
        title: 'Welcome back ',
        message: (this.user?.name || '') + '',
        classList: HOME_NOTIFY_CLASSES
      });
    }
  }

  protected scrollToSection(sectionId: string): void {
    document.getElementById(sectionId)?.scrollIntoView({
      behavior: 'smooth',
      block: 'start',
    });
  }
}
