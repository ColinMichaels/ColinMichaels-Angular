import {DatePipe, NgClass} from '@angular/common';
import {Component, OnInit} from '@angular/core';
import {RouterLink} from '@angular/router';

import {PATH_NAMES} from '../../app-route-paths';
import {BlogPostSummary} from '../../features/blog/models/blog-post.model';
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
    DatePipe,
    HomeTerminalWindowComponent,
    NgClass,
    RouterLink,
    SocialsComponent,
  ],
  templateUrl: './main.component.html',
  standalone: true,
  styleUrl: `./home-page.scss`
})
export class MainComponent implements OnInit {
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

  protected readonly publishedPosts: readonly BlogPostSummary[];
  protected readonly pathNames = PATH_NAMES;

  constructor(
    private notificationService: NotificationService,
    private userService: UserService,
    blogRepository: BlogRepositoryService,
  ) {
    this.user = this.userService.user;
    this.publishedPosts = blogRepository.getPublishedPosts().slice(0, 3);
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
