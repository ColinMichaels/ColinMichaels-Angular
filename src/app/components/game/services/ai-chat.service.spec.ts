import {TestBed} from '@angular/core/testing';
import {firstValueFrom} from 'rxjs';

import {AiChatService} from './ai-chat.service';

describe('AiChatService', () => {
  let service: AiChatService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(AiChatService);
  });

  it('preserves the terminal response contract without a remote request', async () => {
    const response = await firstValueFrom(service.generateAiAnswer('hello', {commands: ['help']}));
    const payload = JSON.parse(response.choices[0].message.content) as Record<string, string>;

    expect(payload['answer']).toContain('remote AI relay is archived');
    expect(payload['message_type']).toBe('system');
    expect(payload['mode']).toBe('dramatic');
  });
});
