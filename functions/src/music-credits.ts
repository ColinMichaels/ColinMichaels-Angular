export interface MusicCreditSchemaEntry {
  readonly year: string;
  readonly album: string;
  readonly artist: string;
  readonly role: string;
}

// Mirrors data/colin-music-credits.json, which remains the canonical visible
// credits list. Functions has an isolated TypeScript build, so this small
// crawl-time mirror is regression-tested against that source file.
export const MUSIC_CREDIT_SCHEMA_ENTRIES: readonly MusicCreditSchemaEntry[] = [
  {year: '2016', album: 'Bad Boy Entertainment: 20 Years - The Box Set', artist: 'Various Artists', role: 'Assistant Engineer'},
  {year: '2014', album: 'Rhythm Is Gonna Get You: Summer Party Fever', artist: 'Various Artists', role: 'Mixing Engineer'},
  {year: '2009', album: 'The Redemption', artist: 'Brooke Hogan', role: 'Mixing'},
  {year: '2009', album: 'GRIII: Old School 2 Nu Skool', artist: 'Urban Mystic', role: 'Engineer, Mixing, Audio Engineer'},
  {year: '2009', album: 'Awake', artist: 'Julian Marley', role: 'Overdubs'},
  {year: '2008', album: 'Gutta', artist: 'Ace Hood', role: 'Engineer'},
  {year: '2008', album: 'Gabriel Amor Inmorta', artist: '', role: 'Mixing'},
  {year: '2008', album: 'Category 6', artist: 'DJ Laz', role: 'Engineer, Mixing'},
  {year: '2008', album: 'Caliente! Baladas: Latin Ballads, Vol. 8', artist: 'Various Artists', role: 'Assistant Engineer'},
  {year: '2006', album: 'Ghetto Revelations, Vol. 2', artist: 'Urban Mystic', role: 'Engineer, Mixing'},
  {year: '2006', album: 'Amor Sin Condiciones', artist: '', role: 'Production Assistant'},
  {year: '2005', album: 'Stop + Algo Más', artist: 'Franco De Vita', role: 'Production Assistant, Assistant Engineer, Recording Assistant'},
  {year: '2005', album: 'Calle 13', artist: 'Calle 13', role: 'Engineer, Mixing, Mixing Engineer'},
  {year: '2004', album: 'Tentando Imaginarios', artist: 'T.K.', role: 'Mixing, Recording'},
  {year: '2004', album: 'Resucitar', artist: 'Gian Marco', role: 'Arranger'},
  {year: '2004', album: 'Imperfecta/Imperfect', artist: 'JD Natasha', role: 'Production Assistant, Assistant, Recording Assistant'},
  {year: '2004', album: 'Ghetto Revelations', artist: 'Urban Mystic', role: 'Engineer, Mixing'},
  {year: '2004', album: 'Estelar', artist: 'Volumen Cero', role: 'Production Assistant'},
  {year: '2004', album: 'Cerveza Time', artist: 'Latin Bangers', role: 'Engineer, Mixing Engineer'},
  {year: '2003', album: 'Wrapped', artist: 'Gloria Estefan', role: 'Assistant Engineer'},
  {year: '2003', album: 'Def Jamaica [Def Jam]', artist: 'Various Artists', role: 'Engineer'},
  {year: '2001', album: 'The Saga Continues', artist: 'Diddy / P. Diddy & the Bad Boy Family', role: 'Assistant Engineer'},
  {year: '2001', album: 'El Lujo de Mexico', artist: 'Marco Antonio Muñiz', role: 'Assistant Engineer'},
  {year: '', album: 'WTF', artist: '', role: 'Assistant Engineer'},
  {year: '', album: 'Songs For The Car 2020', artist: 'Various Artists', role: 'Assistant Engineer'},
  {year: '', album: 'Rap [Rhino]', artist: 'Various Artists', role: 'Assistant Engineer'},
  {year: '', album: 'Rap Workout: Hip-Hop Tracks for the Gym', artist: 'Various Artists', role: 'Assistant Engineer'},
  {year: '', album: 'Lo Esencial de Amor del Bueno, Vol. 5', artist: 'Various Artists', role: 'Assistant Engineer'},
  {year: '', album: 'Hip-Hop History [Rhino]', artist: 'Various Artists', role: 'Assistant Engineer'},
  {year: '', album: "Hip Hop OG's", artist: 'Various Artists', role: 'Assistant Engineer'},
  {year: '', album: 'Everything Sucks', artist: '', role: 'Engineer'},
  {year: '', album: '100 Greatest Rap Songs (The Greatest Hip-Hop Tracks Ever)', artist: 'Various Artists', role: 'Assistant Engineer'},
  {year: '', album: '100 Greatest American Songs (The Greatest Tracks From The USA)', artist: 'Various Artists', role: 'Assistant Engineer'},
];
