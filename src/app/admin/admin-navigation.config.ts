import {IconDefinition} from '@fortawesome/fontawesome-svg-core';
import {
  faCalendarDays,
  faComments,
  faGaugeHigh,
  faHouse,
  faImages,
  faLink,
  faListCheck,
  faNewspaper,
  faTags,
  faUserGear,
  faPenNib,
  faShareNodes,
} from '@fortawesome/free-solid-svg-icons';

import {PATH_NAMES} from '../app-route-paths';

export type AdminNavigationAccess = 'all' | 'cms' | 'media' | 'users';

export interface AdminNavigationItem {
  access: AdminNavigationAccess;
  exact: boolean;
  icon: IconDefinition;
  label: string;
  route: string;
}

export interface AdminNavigationGroup {
  label: string;
  items: readonly AdminNavigationItem[];
}

const adminRoute = `/${PATH_NAMES.ADMIN}`;
const cmsRoute = `${adminRoute}/${PATH_NAMES.ADMIN_CMS}`;

export const ADMIN_NAVIGATION_GROUPS: readonly AdminNavigationGroup[] = [
  {
    label: 'Workspace',
    items: [
      {
        access: 'all',
        exact: true,
        icon: faGaugeHigh,
        label: 'Overview',
        route: adminRoute,
      },
    ],
  },
  {
    label: 'Publishing',
    items: [
      {
        access: 'cms',
        exact: true,
        icon: faNewspaper,
        label: 'Posts',
        route: cmsRoute,
      },
      {
        access: 'cms',
        exact: false,
        icon: faListCheck,
        label: 'Bulk Editor',
        route: `${cmsRoute}/${PATH_NAMES.ADMIN_CMS_CONTENT_OPERATIONS}`,
      },
      {
        access: 'cms',
        exact: false,
        icon: faCalendarDays,
        label: 'Calendar',
        route: `${cmsRoute}/${PATH_NAMES.ADMIN_CMS_CALENDAR}`,
      },
      {
        access: 'cms',
        exact: false,
        icon: faShareNodes,
        label: 'Social Connections',
        route: `${cmsRoute}/${PATH_NAMES.ADMIN_CMS_SOCIAL_CONNECTIONS}`,
      },
      {
        access: 'cms',
        exact: false,
        icon: faPenNib,
        label: 'Authors',
        route: `${cmsRoute}/${PATH_NAMES.ADMIN_CMS_AUTHORS}`,
      },
      {
        access: 'cms',
        exact: false,
        icon: faComments,
        label: 'Comments',
        route: `${adminRoute}/${PATH_NAMES.ADMIN_COMMENTS}`,
      },
    ],
  },
  {
    label: 'Site Content',
    items: [
      {
        access: 'cms',
        exact: false,
        icon: faHouse,
        label: 'Homepage',
        route: `${cmsRoute}/${PATH_NAMES.ADMIN_CMS_HOMEPAGE}`,
      },
      {
        access: 'cms',
        exact: false,
        icon: faTags,
        label: 'Topics',
        route: `${cmsRoute}/${PATH_NAMES.ADMIN_CMS_TOPICS}`,
      },
      {
        access: 'cms',
        exact: false,
        icon: faLink,
        label: 'Recommended Links',
        route: `${cmsRoute}/${PATH_NAMES.ADMIN_CMS_RECOMMENDED_LINKS}`,
      },
    ],
  },
  {
    label: 'Assets',
    items: [
      {
        access: 'media',
        exact: false,
        icon: faImages,
        label: 'Media Library',
        route: `${cmsRoute}/${PATH_NAMES.ADMIN_MEDIA_LIBRARY}`,
      },
    ],
  },
  {
    label: 'Administration',
    items: [
      {
        access: 'users',
        exact: false,
        icon: faUserGear,
        label: 'Users',
        route: `${adminRoute}/${PATH_NAMES.ADMIN_USERS}`,
      },
    ],
  },
];

export function getAdminPageTitle(url: string): string {
  const currentPath = url.split('?')[0].split('#')[0];

  if (currentPath === `${cmsRoute}/new`) {
    return 'New Post';
  }

  if (currentPath.startsWith(`${cmsRoute}/`) && currentPath.endsWith('/edit')) {
    return 'Edit Post';
  }

  if (currentPath === `${adminRoute}/${PATH_NAMES.ADMIN_ACCESS_DENIED}`) {
    return 'Access Required';
  }

  for (const group of ADMIN_NAVIGATION_GROUPS) {
    for (const item of group.items) {
      if (currentPath === item.route || (!item.exact && currentPath.startsWith(`${item.route}/`))) {
        return item.label;
      }
    }
  }

  return 'Admin';
}
