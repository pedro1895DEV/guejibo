const isBrowser = typeof window !== 'undefined';
const host = isBrowser ? window.location.hostname : 'localhost';
const isHttps = isBrowser && window.location.protocol === 'https:';

export const environment = {
  production: false,
  apiUrl: `${isHttps ? 'https:' : 'http:'}//${host}/`,
  wsUrl: `${isHttps ? 'wss:' : 'ws:'}//${host}/ws/`,
  gamesPath: `${isHttps ? 'https:' : 'http:'}//${host}/Games/`
};
