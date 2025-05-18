import { Injectable } from '@angular/core';
import {HttpClient} from '@angular/common/http';

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

  getJoke(type: string) {
    if (type === 'chuck') {
      return this.getChuckNorrisJoke();
    } else  {
      return this.getRandomDadJoke();
    }
  }

  private getChuckNorrisJoke() {
    return this.http.get(this.chuckNorrisEndpoint, {headers: this.headers});
  }

  private getRandomDadJoke() {
    return this.http.get(this.dadJokesEndpoint, {headers: this.headers});
  }
}
