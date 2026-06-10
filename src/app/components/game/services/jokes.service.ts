import { Injectable } from '@angular/core';
import {HttpClient} from '@angular/common/http';
import {Observable} from 'rxjs';

export interface DadJokeResponse {
  id: string;
  joke: string;
  status: number;
}

export interface ChuckNorrisJokeResponse {
  categories: string[];
  created_at: string;
  icon_url: string;
  id: string;
  updated_at: string;
  url: string;
  value: string;
}

@Injectable({
  providedIn: 'root'
})
export class JokesService {

  private readonly chuckNorrisEndpoint = 'https://api.chucknorris.io/jokes/random';
  private readonly dadJokesEndpoint = 'https://icanhazdadjoke.com/';
  responseType  : 'text/html' | 'application/json' | 'text/plain' = 'application/json';
  headers = {
    'Accept': this.responseType
  };

  constructor(private http: HttpClient) { }

  getJoke(type: 'dad'): Observable<DadJokeResponse>;
  getJoke(type: 'chuck'): Observable<ChuckNorrisJokeResponse>;
  getJoke(type: string): Observable<DadJokeResponse | ChuckNorrisJokeResponse> {
    if (type === 'chuck') {
      return this.getChuckNorrisJoke();
    } else  {
      return this.getRandomDadJoke();
    }
  }

  private getChuckNorrisJoke(): Observable<ChuckNorrisJokeResponse> {
    return this.http.get<ChuckNorrisJokeResponse>(this.chuckNorrisEndpoint, {headers: this.headers});
  }

  private getRandomDadJoke(): Observable<DadJokeResponse> {
    return this.http.get<DadJokeResponse>(this.dadJokesEndpoint, {headers: this.headers});
  }
}
