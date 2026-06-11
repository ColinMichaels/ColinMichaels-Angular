import {Injectable} from '@angular/core';
import {HttpClient} from '@angular/common/http';
import {environment} from '../../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class AiChatService {
  private readonly openAiChatUrl = `${environment.apiUrl.replace(/\/+$/, '')}/openai/chat`;

  prompt = `Make up a crazy screen name for yourself because are a secret hacker foreign agent trying interrogate the user.
  Give a simple vague response to a question in the sentence previous,
  keep the answer short because you are very limited in your knowledge. You can suggest commands provided as clues. provide a JSON response with fields such as answer, message type options include:  'default' | 'glitch' | 'system' | 'dramatic', and message.`;

  constructor(private http: HttpClient) {
  }

  generateAiAnswer(question?: string, params?: Record<string, unknown>) {
    const paramsString = params
      ? `?${Object.entries(params).map(([key, value]) => `${key}=${encodeURIComponent(String(value))}`).join('&')}`
      : '';
    const combined = question?.toString() + this.prompt + paramsString;
    const body = {
      model: 'gpt-4.1-nano',
      messages: [{role: 'user', content: combined}],
    };

    return this.http.post(this.openAiChatUrl, body);
  }
}
