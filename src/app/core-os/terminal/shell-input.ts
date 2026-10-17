// Parse only virtual shell words and pipes. Quoted operators remain literal text.
export function parseShellInput(input: string, partial = false) {
  const pipeline: string[][] = [[]];
  let word = '';
  let quote = '';
  let escaped = false;
  let started = false;
  let tokenStart = input.length;
  const finish = () => {
    if (started) pipeline[pipeline.length - 1].push(word);
    word = ''; started = false;
  };
  for (let index = 0; index < input.length; index++) {
    const char = input[index];
    if (!started && !/\s/.test(char) && char !== '|') tokenStart = index;
    if (escaped) { word += char; escaped = false; started = true; }
    else if (char === '\\' && quote !== "'") { escaped = true; started = true; }
    else if (quote) {
      if (char === quote) quote = '';
      else word += char;
    } else if (char === '"' || char === "'") { quote = char; started = true; }
    else if (char === '|') {
      finish();
      if (!pipeline[pipeline.length - 1].length) throw new Error('zsh: empty pipeline command');
      pipeline.push([]);
    } else if (';&<>'.includes(char)) throw new Error(`zsh: operator ${char} is not supported in this virtual shell`);
    else if (/\s/.test(char)) { finish(); tokenStart = input.length; }
    else { word += char; started = true; }
  }
  if (!partial && (quote || escaped)) throw new Error('zsh: unmatched quote or trailing escape');
  const currentWord = word;
  finish();
  if (!partial && pipeline.length > 1 && !pipeline[pipeline.length - 1].length) {
    throw new Error('zsh: empty pipeline command');
  }
  if (pipeline.length > 8) throw new Error('zsh: use at most eight commands in a pipeline');
  return {pipeline, currentWord, tokenStart, started: tokenStart !== input.length};
}
