import {Injectable} from '@angular/core';
import {BehaviorSubject, interval} from 'rxjs';

export interface Track {
  id: number;
  title: string;
  artist: string;
  albumArt: string;
  url: string;
  duration: number;
}

export const MUSIC_PLAYER_SETTING_ID = 'music-player';

export const TRACKS: Track[] = [
  {
    id: 0,
    title: 'Ambient 1',
    artist: 'Colin Michaels',
    albumArt: 'https://picsum.photos/100/100.webp?random=1',
    url: '/assets/audio/music/ambient_1.mp3',
    duration: 240
  },
  {
    id: 1,
    title: 'Ambient 2',
    artist: 'Colin Michaels',
    albumArt: 'https://picsum.photos/100/100.webp?random=2',
    url: '/assets/audio/music/ambient_2.mp3',
    duration: 240
  },
  {
    id: 2,
    title: 'Ambient 3',
    artist: 'Colin Michaels',
    albumArt: 'https://picsum.photos/100/100.webp?random=3',
    url: '/assets/audio/music/ambient_3.mp3',
    duration: 240
  },
  {
    id: 3,
    title: 'Ambient 4',
    artist: 'Colin Michaels',
    albumArt: 'https://picsum.photos/100/100.webp?random=3',
    url: '/assets/audio/music/ambient_4.mp3',
    duration: 240
  }
]

@Injectable({providedIn: 'root'})
export class MusicService {
  private player = new Audio();
  private _currentTrack: Track = TRACKS[0];

  public currentTrack = this._currentTrack;
  public library: Track[] = TRACKS;

  public trackChanged = new BehaviorSubject<Track>(this._currentTrack);
  public timeUpdated = new BehaviorSubject<number>(0);
  public isPlayingChanged = new BehaviorSubject<boolean>(false);
  public mutedChanged = new BehaviorSubject<boolean>(false);
  public volumeChanged = new BehaviorSubject<number>(this.player.volume);

  private timer = interval(1000).subscribe(() => {
    if (!this.player.paused) {
      this.timeUpdated.next(this.player.currentTime);
    }
  });

  constructor() {
    this.player.src = this._currentTrack.url;
    this.player.load();
  }

  play() {
    this.player.play();
    this.isPlayingChanged.next(true);
  }

  pause() {
    this.player.pause();
    this.isPlayingChanged.next(false);
  }

  volume() {
    return this.player.volume;
  }

  loopEnabled() {
    return this.player.loop;
  }

  isMuted() {
    return this.player.muted;
  }

  stopAll() {
    this.player.pause();
    this.player.currentTime = 0;
    this.isPlayingChanged.next(false);
  }

  load(track: Track) {
    this._currentTrack = track;
    this.currentTrack = track;
    this.player.src = track.url;
    this.player.load();
    this.trackChanged.next(track);
    this.timeUpdated.next(0);
    this.isPlayingChanged.next(false);
  }

  next() {
    const currentIndex = this.library.findIndex(t => t.id === this._currentTrack.id);
    const nextTrack = this.library[(currentIndex + 1) % this.library.length];
    this.load(nextTrack);
    this.play();
  }

  previous() {
    const currentIndex = this.library.findIndex(t => t.id === this._currentTrack.id);
    const prevIndex = (currentIndex - 1 + this.library.length) % this.library.length;
    const prevTrack = this.library[prevIndex];
    this.load(prevTrack);
    this.play();
  }

  setVolume(volume: number) {
    const normalized = Math.min(1, Math.max(0, volume));
    this.player.muted = false;
    this.player.volume = normalized;
    this.mutedChanged.next(false);
    this.volumeChanged.next(normalized);
  }

  setMuted(muted: boolean) {
    this.player.muted = muted;
    this.mutedChanged.next(muted);
  }

  setLoop(enabled: boolean) {
    this.player.loop = enabled;
  }
}
