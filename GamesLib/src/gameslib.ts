import Cookies from 'js-cookie';

declare const WS_DEV_URL: string;
const SHOUT_IM_HERE_INTERVAL = 800;

function resolveWsBaseUrl(): string {
    if (typeof WS_DEV_URL === 'string' && WS_DEV_URL.length > 0) {
        return WS_DEV_URL;
    }
    const protocol = window.location.protocol === 'https:' ? 'wss://' : 'ws://';
    return protocol + window.location.host + '/ws/';
}

/**
 * Represents a connection to the web socket server.
 * Authenticates automatically and can send and receive
 * messages.
 */
export class GameConnection {
    private jwt: string | undefined;
    private gameRoomId: number;
    private ws: WebSocket | undefined = undefined;
    private intervalId: number | undefined = undefined;
    private endGameCallback: ((data: GameConnection.EndGameData) => void) | undefined = undefined;
    private endGameData: GameConnection.EndGameData | undefined = undefined;
    private queuedMessageCallbacks: (() => void)[] = [];

    /** Reconnection state */
    private intentionalClose = false;
    private retryDelay = 1000;
    private static readonly MAX_RETRY_DELAY = 30000;
    private static readonly BACKOFF_MULTIPLIER = 2;
    private reconnectTimer: number | null = null;

    /**
     * Creates a GameConnection object from data stored in cookies.
     */
    constructor() {
        this.jwt = Cookies.get('jwt');
        this.gameRoomId = parseInt(Cookies.get('gameroom') || '0', 10);
        this.connect();
    }

    /**
     * Creates a connection to the web socket server.
     * Automatically reconnects with exponential backoff on failure.
     */
    private connect(): void {
        if (!this.jwt) {
            console.warn('[GamesLib] No JWT cookie found. Running in standalone/preview mode without multiplayer WebSocket.');
            return;
        }

        if (this.ws !== undefined && this.ws.readyState === WebSocket.OPEN) {
            return;
        }

        const socket = new WebSocket(resolveWsBaseUrl() + this.jwt) as GameConnection.MyWebSocket;
        socket.gameConnection = this;
        socket.onmessage = onmessage;
        socket.onopen = () => {
            this.retryDelay = 1000;

            this.intervalId = window.setInterval(() => {
                if (this.ws && this.ws.readyState === WebSocket.OPEN) {
                    this.ws.send(JSON.stringify({
                        action: 'im-ready',
                        gameroom: this.gameRoomId
                    }));
                }
            }, SHOUT_IM_HERE_INTERVAL);

            for (const sendMessage of this.queuedMessageCallbacks) {
                sendMessage();
            }
            this.queuedMessageCallbacks = [];
        };
        socket.onclose = () => {
            if (this.intervalId !== undefined) {
                window.clearInterval(this.intervalId);
            }
            this.scheduleReconnect();
        };
        socket.onerror = () => {
            if (this.intervalId !== undefined) {
                window.clearInterval(this.intervalId);
            }
            socket.close();
        };

        this.ws = socket;
    }

    /**
     * Schedules a reconnection attempt with exponential backoff.
     */
    private scheduleReconnect(): void {
        if (this.intentionalClose) return;

        if (this.reconnectTimer !== null) return;

        this.reconnectTimer = window.setTimeout(() => {
            this.reconnectTimer = null;
            this.ws = undefined;
            this.connect();
        }, this.retryDelay);

        this.retryDelay = Math.min(
            this.retryDelay * GameConnection.BACKOFF_MULTIPLIER,
            GameConnection.MAX_RETRY_DELAY
        );
    }

    /**
     * Intentionally disconnects the WebSocket (no auto-reconnect).
     */
    public disconnect(): void {
        this.intentionalClose = true;
        if (this.intervalId !== undefined) {
            window.clearInterval(this.intervalId);
        }
        if (this.reconnectTimer !== null) {
            window.clearTimeout(this.reconnectTimer);
            this.reconnectTimer = null;
        }
        if (this.ws) {
            this.ws.close();
            this.ws = undefined;
        }
    }

    /**
     * Sends the current player score
     * @param score The current score
     * @param endgame If true, signals that the game has ended for this player
     */
    public sendScore(score: number | string, endgame = false): void {
        const numericScore = typeof score !== 'number' ? parseInt(score, 10) : score;
        const doit = () => {
            if (this.ws && this.ws.readyState === WebSocket.OPEN) {
                this.ws.send(JSON.stringify({
                    action: 'update-score',
                    gameroom: this.gameRoomId,
                    score: numericScore,
                    endgame: endgame
                }));
            }
        };

        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            doit();
        } else {
            this.queuedMessageCallbacks.push(doit);
        }

        if (endgame === true && this.intervalId !== undefined) {
            window.clearInterval(this.intervalId);
        }
    }

    /**
     * Setter for endGameData
     * @param endGameData
     */
    public setEndGameData(endGameData: GameConnection.EndGameData): void {
        this.endGameData = endGameData;
    }

    /**
     * Sets up a function to be called upon receiving confirmation
     * from the server that the game is over for this player.
     * @param callback The function to be called.
     */
    public onEndGame(callback: (data: GameConnection.EndGameData) => void): void {
        this.endGameCallback = callback;
    }

    /**
     * Returns the end game callback function.
     */
    public getEndGameCallback(): ((data: GameConnection.EndGameData) => void) | undefined {
        return this.endGameCallback;
    }

    /**
     * Loads up the page that will allow the user to complete the registration.
     */
    public loadJoinPage(): void {
        if (this.endGameData && this.endGameData.user) {
            Cookies.set('tmpuser', JSON.stringify(this.endGameData.user), { path: '/' });
        }
        window.open('../../register', '_self');
    }
}

export namespace GameConnection {
    /**
     * The data that is available to the end game callback function.
     */
    export interface EndGameData {
        gameroom: number;
        score: number;
        user: {
            id: number;
            name: string;
        };
    }

    /**
     * WebSocket extension with an extra property to track the GameConnection
     * object that created it.
     */
    export interface MyWebSocket extends WebSocket {
        gameConnection: GameConnection;
    }
}

/**
 * Shows an error to the console indicating a parsing error.
 * @param data The message that could not be parsed.
 */
function showParsingError(data: unknown): void {
    console.log(`GamesLib error; Invalid message received from server: ${data}`);
}

/**
 * What happens when a message is received.
 */
function onmessage(this: WebSocket, ev: MessageEvent): void {
    let data: any;

    try {
        data = JSON.parse(ev.data);
    } catch {
        showParsingError(ev.data);
        return;
    }

    if (!data || typeof data !== 'object' || !('req' in data)) {
        showParsingError(data);
        return;
    }

    switch (data.req) {
        case 'user-game-over': {
            if (!('gameroom' in data) || !('score' in data) || !data.user) {
                showParsingError(data);
                return;
            }

            const endGameData: GameConnection.EndGameData = {
                user: {
                    id: parseInt(data.user.id, 10),
                    name: String(data.user.name)
                },
                gameroom: parseInt(data.gameroom, 10),
                score: parseInt(data.score, 10)
            };
            const gameConn = (this as GameConnection.MyWebSocket).gameConnection;
            gameConn.setEndGameData(endGameData);

            const endGameCallback = gameConn.getEndGameCallback();
            if (endGameCallback) {
                endGameCallback(endGameData);
            }
            break;
        }

        default:
            showParsingError(data);
    }
}
