import {Page} from '@playwright/test';

const MEMBERSHIP_DISMISSAL_KEY = 'cm.blog-membership-campaign.dismissal.v1';

export async function suppressMembershipCampaign(page: Page): Promise<void> {
  await page.addInitScript(({key, nextEligibleAt}) => {
    window.localStorage.setItem(key, JSON.stringify({nextEligibleAt}));
  }, {
    key: MEMBERSHIP_DISMISSAL_KEY,
    nextEligibleAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
  });
}
