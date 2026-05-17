/** 5-letter Wordle word list — tech + desi */
export const WORDLE_WORDS = [
  'MAXES', 'CYBER', 'STACK', 'DEBUG', 'PATCH', 'PROXY', 'CACHE', 'BYTES', 'CLOUD',
  'LINUX', 'REACT', 'NGINX', 'REDIS', 'QUERY', 'TOKEN', 'LOGIN', 'ROUTE', 'ARRAY',
  'ASYNC', 'YAARS', 'BHAIS', 'JUGAD', 'THALA', 'ROWDY', 'FILMY', 'DRAMA', 'SCENE',
  'HEROS', 'SONGS', 'DANCE', 'RADIO', 'VIDEO', 'PIXEL', 'EMOJI', 'MEMES', 'TREND',
  'VIRAL', 'LIKES', 'SHARE', 'CHATS', 'GROUP', 'SQUAD', 'HACKS', 'CODER', 'GEEKS',
  'NERDS', 'MODEM', 'EMAIL', 'INBOX', 'ALERT', 'PINGS', 'FLASK', 'SWIFT', 'SHELL',
  'LOGIC', 'GRAPH', 'CHART', 'TABLE', 'FIELD', 'INDEX', 'MERGE', 'SPLIT', 'CLONE',
  'FORKS', 'PULLS', 'STASH', 'HOOKS', 'LINTS', 'BUILD', 'SCALE', 'SHARD', 'QUEUE',
  'TOPIC', 'EVENT', 'BATCH', 'TIMER', 'DELAY', 'RETRY', 'FAULT', 'ERROR', 'FIXED',
  'PASSED', 'FAILED', 'GREEN', 'AMBER', 'NEONS', 'SCORE', 'LEVEL', 'STAGE', 'ROUND',
  'MATCH', 'PLAYS', 'PAUSE', 'START', 'RESET', 'SAVES', 'LOADS', 'SYNCS', 'LINKS',
  'NODES', 'EDGES', 'GRIDS', 'MODEL', 'TRAIN', 'AGENT', 'TOOLS', 'SKILL', 'RULES',
  'STATE', 'STORE', 'PROPS', 'THEME', 'MODES', 'INPUT', 'FORMS', 'VALID', 'MODAL',
  'TOAST', 'PANEL', 'CARDS', 'ITEMS', 'SLIDE', 'ZOOMS', 'SPINS', 'FLIPS', 'PULSE',
  'WAVES', 'PATHS', 'FRAME', 'LOOPS', 'TICKS', 'EPOCH', 'PARSE', 'AUDIO', 'MEDIA',
  'NOTES', 'CHORD', 'SCALE', 'TEMPO', 'BEATS', 'VERSE', 'BRIDGE', 'INTRO', 'OUTRO',
  'RHYME', 'IRONY', 'SATIRE', 'PARODY', 'LORE', 'MYTH', 'EPIC', 'NOVEL', 'PLOT',
  'HERO', 'QUEST', 'PEACE', 'TRUCE', 'CHESS', 'TITLE', 'SWISS', 'ROBIN', 'SEED',
  'POINT', 'HALF', 'SPARK', 'KAFKA', 'MYSQL', 'MONGO', 'REDUX', 'VUEJS', 'NEXT',
  'DENOS', 'RUSTY', 'GOLANG', 'PERL', 'BASH', 'ZSH', 'VIM', 'EMACS', 'GIT',
].filter((w) => w.length === 5);

export function getDailyWord(date = new Date()) {
  const key = date.toISOString().slice(0, 10);
  let hash = 0;
  for (let i = 0; i < key.length; i += 1) {
    hash = (hash * 31 + key.charCodeAt(i)) >>> 0;
  }
  const list = WORDLE_WORDS.length ? WORDLE_WORDS : ['MAXES'];
  return list[hash % list.length];
}

export default WORDLE_WORDS;
