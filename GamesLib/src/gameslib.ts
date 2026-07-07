import Cookies from 'js-cookie';

declare const WSURL: string;
const SHOUT_IM_HERE_INTERVAL = 800;

/**
 * Represents a connection to the web socket server.
 * Authenticates automatically and can send and receive
 * messages.
 */
export class GameConnection {
    private jwt: string;
    private gameRoomId: number;
    private ws: WebSocket = undefined;
    private intervalId: number;
    private endGameCallback: (data: GameConnection.EndGameData) => void;
    private endGameData: GameConnection.EndGameData;
    private queuedMessageCallbacks: (() => void)[] = [];

    /** Reconnection state */
    private intentionalClose = false;
    private retryDelay = 1000;
    private static readonly MAX_RETRY_DELAY = 30000;
    private static readonly BACKOFF_MULTIPLIER = 2;
    private reconnectTimer: number = null;

    /**
     * Creates a GameConnection object from data stored in cookies.
     */
    constructor() {
        this.jwt = Cookies.get('jwt');
        this.gameRoomId = parseInt(Cookies.get('gameroom'));
        this.connect();
    }

    /**
     * Creates a connection to the web socket server.
     * Automatically reconnects with exponential backoff on failure.
     */
    private connect() {
        if (
            (this.ws !== undefined) &&
            (this.ws.readyState == WebSocket.OPEN)
        ) {
            return;
        }

        this.ws = new WebSocket(WSURL + this.jwt);
        (<GameConnection.MyWebSocket>this.ws).gameConnection = this;
        this.ws.onmessage = onmessage;
        this.ws.onopen = () => {
            this.retryDelay = 1000;

            this.intervalId = window.setInterval(() => {
                this.ws.send(JSON.stringify(
                    {
                        action: 'im-ready',
                        gameroom: this.gameRoomId
                    }
                ));
            }, SHOUT_IM_HERE_INTERVAL);

            for(let sendMessage of this.queuedMessageCallbacks){
                sendMessage();
            }
            this.queuedMessageCallbacks = [];
        };
        this.ws.onclose = () => {
            window.clearInterval(this.intervalId);
            this.scheduleReconnect();
        };
        this.ws.onerror = () => {
            window.clearInterval(this.intervalId);
            this.ws.close();
        };
    }

    /**
     * Schedules a reconnection attempt with exponential backoff.
     */
    private scheduleReconnect() {
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
    public disconnect() {
        this.intentionalClose = true;
        window.clearInterval(this.intervalId);
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
    public sendScore(score: (number | string), endgame = false) {
        let doit = () => {
            this.ws.send(JSON.stringify(
                {
                    action: 'update-score',
                    gameroom: this.gameRoomId,
                    score: (typeof score !== 'number') ? parseInt(score) : score,
                    endgame: endgame
                }
            ));
        };

        if (this.ws && this.ws.readyState === WebSocket.OPEN){
            doit();
        }
        else{
            this.queuedMessageCallbacks.push(doit);
        }

        if (endgame === true) {
            window.clearInterval(this.intervalId);
        }
    }

    /**
     * Setter for endGameData
     * @param endGameData
     */
    setEndGameData(endGameData: GameConnection.EndGameData) {
        this.endGameData = endGameData;
    }

    /**
     * Sets up a function to be called upon receiving confirmation
     * from the server that the game is over for this player.
     * @param callback The function to be called.
     */
    public onEndGame(callback: (data: GameConnection.EndGameData) => void) {
        this.endGameCallback = callback;
    }

    /**
     * Returns the end game callback function.
     */
    public getEndGameCallback(): (data: GameConnection.EndGameData) => void {
        return this.endGameCallback;
    }

    /**
     * Loads up the page that will allow the user to complete the registration.
     */
    public loadJoinPage() {
        Cookies.set('tmpuser', JSON.stringify(this.endGameData.user), { path: '/' });
        window.open('../../register', '_self');
    }

}

export namespace GameConnection {

    /**
     * The data that is avaliable to the end game callback function.
     */
    export interface EndGameData {
        gameroom: number,
        score: number,
        user: {
            id: number,
            name: string
        }
    };

    /**
     * WebSocket extension with an extra property to track the GameConnection
     * object that created it.
     */
    export interface MyWebSocket extends WebSocket {
        gameConnection: GameConnection
    }

}

/**
 * What happens when a message is received.
 */
function onmessage(ev: MessageEvent) {
    let data: any;

    try {
        data = JSON.parse(ev.data);
    }
    catch (e) {
        this.showParsingError(ev.data);
        return;
    }

    if ('req' in data === false) {
        showParsingError(data);
        return;
    }

    switch (data.req) {
        case 'user-game-over':
            if ((('gameroom' in data) && ('score' in data)) === false) {
                showParsingError(data);
                return;
            }

            //Saves the returned data for later use
            let endGameData =  {
                user: {
                    id: parseInt(data.user.id),
                    name: data.user.name
                },
                gameroom: parseInt(data.gameroom),
                score: parseInt(data.score)
            };
            (<GameConnection.MyWebSocket>this).gameConnection.setEndGameData(endGameData);

            //Calls the callback
            (<GameConnection.MyWebSocket>this).gameConnection.getEndGameCallback()(endGameData);

            break;

        default:
            showParsingError(data);
    }

    /**
    * Shows an error to the console indicating a parsing error.
    * @param data The message that could not be parsed.
    */
    function showParsingError(data: any): void {
        console.log(`GamesLib error; Invalid message received from server: ${data}`);
    }

}
