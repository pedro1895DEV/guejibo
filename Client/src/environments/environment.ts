const isBrowser = typeof window !== 'undefined';
const host = isBrowser ? window.location.hostname : 'localhost';
const isHttps = isBrowser && window.location.protocol === 'https:';

export const environment = {
  production: true,
  apiUrl: `${isHttps ? 'https:' : 'http:'}//${host}:3000/`,
  wsUrl: `${isHttps ? 'wss:' : 'ws:'}//${host}:3000/`,
  gamesPath: `${isHttps ? 'https:' : 'http:'}//${host}/Games/`
};
