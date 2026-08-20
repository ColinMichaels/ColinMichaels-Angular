import rawCredits from '../../../../data/colin-music-credits.json';

export interface MusicCredit {
  year: string;
  album: string;
  artist: string;
  credit: string;
  spotifyUrl: string;
  appleMusicUrl: string;
}

interface RawMusicCredit {
  year: string;
  album: string;
  artist: string;
  credit: string;
  spotify_url: string;
  apple_music_url: string;
}

/**
 * The source list stays in /data so it can be reviewed and expanded without
 * coupling discography research to the author-profile presentation layer.
 */
export const COLIN_MUSIC_CREDITS: readonly MusicCredit[] = (rawCredits as RawMusicCredit[]).map(credit => ({
  year: credit.year.trim(),
  album: credit.album.trim(),
  artist: credit.artist.trim(),
  credit: credit.credit.trim(),
  spotifyUrl: credit.spotify_url,
  appleMusicUrl: credit.apple_music_url,
}));

export const COLIN_MUSIC_CREDIT_COUNT = COLIN_MUSIC_CREDITS.length;
