import {Injectable} from '@angular/core';
import {Observable, of} from 'rxjs';

export interface AiChatResponse {
  choices: Array<{
    message: {
      content: string;
    };
  }>;
}

@Injectable({
  providedIn: 'root'
})
export class AiChatService {
  /**
   * The original terminal experiment called a generic public OpenAI proxy that
   * was never part of the deployable Functions entry point. Keep the terminal
   * command contract intact, but answer locally so the prototype cannot leak a
   * vendor credential or create an unauthenticated quota surface.
   */
  generateAiAnswer(question?: string, params?: Record<string, unknown>): Observable<AiChatResponse> {
    void question;
    void params;

    return of({
      choices: [{
        message: {
          content: JSON.stringify({
            answer: 'The remote AI relay is archived. Try help to continue exploring the terminal.',
            message_type: 'system',
            mode: 'dramatic',
          }),
        },
      }],
    });
  }
}
