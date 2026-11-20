import { Injectable } from '@angular/core';
import { User } from './auth.service';
import { WaitingUser } from './new-room/waiting-user/waiting-user.component';
import { GlobalConstants } from './common/global-constants';
import { interval, Subscription } from 'rxjs';

interface TableEntry {
  user: User;
  waitingUser: WaitingUser;
  lastSeem: number;
}

@Injectable({
  providedIn: 'root'
})
export class WaitingListService {
  private outputUsers: WaitingUser[] = [];
  private waitingTable: { [index: number]: TableEntry } = {};
  private intervalSub: Subscription | null = null;

  constructor() { }

  /**
   * Sets up the service. Must be called before everything else.
   */
  initialize(): void {
    this.stopMonitoring();
    this.intervalSub = interval(GlobalConstants.TIMES.CHECK_PLAYERS_ONLINE_INTERVAL)
      .subscribe(() => this.checkOfflineUsers());
  }

  /**
   * Stops checking player heartbeats (e.g. once the game has ended).
   */
  stopMonitoring(): void {
    if (this.intervalSub) {
      this.intervalSub.unsubscribe();
      this.intervalSub = null;
    }
  }

  /**
   * Marks as offline any user that hasn't sent a message in a while.
   */
  checkOfflineUsers(): void {
    const now = Date.now();

    for (const i in this.waitingTable) {
      const entry = this.waitingTable[i];
      if (now - entry.lastSeem > GlobalConstants.TIMES.WAIT_FOR_PLAYER_SHOUT) {
        entry.waitingUser.online = false;
      }
    }
  }

  /**
   * Called when a "player-is-ready" message is received from the server.
   * Adds new users to the user list or marks existing users as online.
   */
  playerIsReady(user: User): void {
    if (user.id in this.waitingTable) {
      this.waitingTable[user.id].lastSeem = Date.now();
      this.waitingTable[user.id].waitingUser.online = true;
    } else {
      const waitingUser: WaitingUser = {
        name: user.name,
        online: true,
        finished: false,
        score: 0
      };
      this.outputUsers.push(waitingUser);

      this.waitingTable[user.id] = {
        user: user,
        waitingUser: waitingUser,
        lastSeem: Date.now()
      };
    }
  }

  /**
   * Updates the player score on the list.
   * Called whenever a user score is updated during the game.
   */
  updateScore(userID: number, score: number, endgame: boolean): void {
    if (userID in this.waitingTable) {
      const user = this.waitingTable[userID].waitingUser;
      user.score = score;
      user.finished = endgame;
    }
  }

  /**
   * Sorts the player list by descending score for final leaderboard display.
   * Safe because waitingTable holds direct object references instead of array indices.
   */
  sortUsersByScore(): void {
    this.outputUsers.sort((a, b) => b.score - a.score);
  }

  /**
   * Should be called when the service is no longer needed.
   */
  cleanUp(): void {
    this.stopMonitoring();
    this.outputUsers = [];
    this.waitingTable = {};
  }

  getUsers(): WaitingUser[] {
    return this.outputUsers;
  }

}
