import {ComponentFixture, TestBed} from '@angular/core/testing';
import {RouterTestingModule} from '@angular/router/testing';

import {SocialConnectionsService} from '../../services/social-connections.service';
import {SocialConnectionsPageComponent} from './social-connections-page.component';

describe('SocialConnectionsPageComponent', () => {
  let fixture: ComponentFixture<SocialConnectionsPageComponent>;
  let connectionsService: jasmine.SpyObj<SocialConnectionsService>;

  beforeEach(async () => {
    connectionsService = jasmine.createSpyObj('SocialConnectionsService', [
      'beginConnection',
      'disconnect',
      'listConnections',
      'selectAccount',
    ]);
    connectionsService.listConnections.and.resolveTo({
      fetchedAt: '2026-07-13T12:00:00.000Z',
      deliveryEnabled: false,
      connections: [
        {
          provider: 'facebook',
          status: 'needs-selection',
          scopes: ['pages_manage_posts'],
          updatedAt: '2026-07-13T12:00:00.000Z',
          availableAccounts: [{id: 'page-1', label: 'Colin Michaels'}],
        },
        {
          provider: 'instagram',
          status: 'needs-selection',
          scopes: ['instagram_content_publish'],
          updatedAt: '2026-07-13T12:00:00.000Z',
          availableAccounts: [{
            id: 'ig-1',
            label: '@captaincolin',
            note: 'Linked through Facebook Page Colin Michaels'
          }],
        },
        {provider: 'threads', status: 'disconnected', scopes: [], updatedAt: '2026-07-13T12:00:00.000Z'},
      ],
    });
    connectionsService.selectAccount.and.resolveTo();

    await TestBed.configureTestingModule({
      imports: [SocialConnectionsPageComponent, RouterTestingModule],
      providers: [{provide: SocialConnectionsService, useValue: connectionsService}],
    }).compileComponents();

    fixture = TestBed.createComponent(SocialConnectionsPageComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  });

  it('shows provider status without implying delivery is active', () => {
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';

    expect(text).toContain('Facebook Page');
    expect(text).toContain('Instagram');
    expect(text).toContain('Threads');
    expect(text).toContain('Connection-only phase');
    expect(text).toContain('Choose account');
  });

  it('selects an explicit Facebook Page when multiple accounts require a choice', async () => {
    const button = Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('button'))
      .find(candidate => candidate.textContent?.includes('Colin Michaels'));

    if (!(button instanceof HTMLButtonElement)) {
      throw new Error('Facebook Page selection button was not found.');
    }

    button.click();
    await fixture.whenStable();

    expect(connectionsService.selectAccount).toHaveBeenCalledOnceWith('facebook', 'page-1');
  });

  it('selects a linked Instagram professional account through the shared Meta connection', async () => {
    const button = Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('button'))
      .find(candidate => candidate.textContent?.includes('@captaincolin'));

    if (!(button instanceof HTMLButtonElement)) {
      throw new Error('Instagram account selection button was not found.');
    }

    button.click();
    await fixture.whenStable();

    expect(connectionsService.selectAccount).toHaveBeenCalledWith('instagram', 'ig-1');
  });
});
