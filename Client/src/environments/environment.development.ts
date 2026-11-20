const isBrowser = typeof window !== 'undefined';
const hostname = isBrowser ? window.location.hostname : 'localhost';

export const environment = {
  production: false,
  apiUrl: `http://${hostname}:3000/`,
  wsUrl: `ws://${hostname}:3000/`,
  gamesPath: `http://${hostname}:3000/games/`
};
