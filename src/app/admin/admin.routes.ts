import {Routes} from '@angular/router';

import {PATH_NAMES} from '../app-route-paths';
import {AdminAuthGuard} from '../guards/admin-auth.guard';
import {COMMENT_MODERATION_SEO_METADATA, USER_MANAGEMENT_SEO_METADATA} from '../shared/seo/seo.metadata';
import {ADMIN_CONSOLE_ROLES, CMS_ACCESS_ROLES, USER_MANAGEMENT_ACCESS_ROLES} from '../shared/user-account/user-account.model';
import {cmsRoutes} from './cms/cms.routes';

export const adminRoutes: Routes = [
  {
    path: PATH_NAMES.ADMIN,
    loadComponent: () => import('./admin-shell.component').then(m => m.AdminShellComponent),
    children: [
      {
        path: PATH_NAMES.ADMIN_ACCESS_DENIED,
        loadComponent: () => import('./pages/admin-access-denied/admin-access-denied.component').then(m => m.AdminAccessDeniedComponent),
      },
      {
        path: PATH_NAMES.ADMIN_USERS,
        canActivate: [AdminAuthGuard],
        data: {roles: USER_MANAGEMENT_ACCESS_ROLES, seo: USER_MANAGEMENT_SEO_METADATA},
        loadComponent: () => import('./user-management/user-management-page.component').then(m => m.UserManagementPageComponent),
      },
      {
        path: PATH_NAMES.ADMIN_COMMENTS,
        canActivate: [AdminAuthGuard],
        data: {roles: CMS_ACCESS_ROLES, seo: COMMENT_MODERATION_SEO_METADATA},
        loadComponent: () => import('./comment-moderation/comment-moderation-page.component').then(m => m.CommentModerationPageComponent),
      },
      {
        path: PATH_NAMES.ADMIN_GUIDE,
        canActivate: [AdminAuthGuard],
        data: {roles: ADMIN_CONSOLE_ROLES},
        loadComponent: () => import('./guide/admin-guide-page.component').then(m => m.AdminGuidePageComponent),
      },
      {
        path: '',
        canActivateChild: [AdminAuthGuard],
        data: {roles: ADMIN_CONSOLE_ROLES},
        children: [
          {
            path: '',
            pathMatch: 'full',
            loadComponent: () => import('./pages/admin-overview/admin-overview.component').then(m => m.AdminOverviewComponent),
          },
          {
            path: PATH_NAMES.ADMIN_MEDIA_LIBRARY,
            redirectTo: `${PATH_NAMES.ADMIN_CMS}/${PATH_NAMES.ADMIN_MEDIA_LIBRARY}`,
            pathMatch: 'full',
          },
          ...cmsRoutes,
        ],
      },
    ],
  },
];
