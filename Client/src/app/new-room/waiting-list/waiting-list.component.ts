import { Component, OnInit, Input, Output, EventEmitter } from '@angular/core';
import { WaitingUser, WaitingUserComponent } from '../waiting-user/waiting-user.component';
import { WaitingListService } from 'src/app/waiting-list.service';
import { NgClass, NgIf, NgFor } from '@angular/common';

export enum State {
  Waiting, Playing, Ended
}

@Component({
    selector: 'nr-waiting-list',
    templateUrl: './waiting-list.component.html',
    styleUrls: ['./waiting-list.component.scss'],
    imports: [NgClass, NgIf, WaitingUserComponent, NgFor]
})
export class WaitingListComponent implements OnInit {
  public StateEnum = State;

  public users: WaitingUser[] = [];
  public state: State = State.Waiting;

  @Input() showStartGameButton: boolean | string = false;
  @Input() permanentOnlineUser: WaitingUser | null = null;

  @Output() public gameStart = new EventEmitter<void>();
  @Output() public gameEnd = new EventEmitter<void>();

  constructor(
    private waitingListService: WaitingListService
  ) { }

  ngOnInit(): void {
    this.users = this.waitingListService.getUsers();
  }

  getHeightClass(): string {
    if (!this.users) {
      return '';
    }
    if (this.users.length <= 30) {
      return 'height1';
    }
    if (this.users.length <= 60) {
      return 'height2';
    }
    return 'height3';
  }

  startGame(): void {
    this.state = State.Playing;
    this.gameStart.emit();
  }

  endGame(): void {
    this.gameEnd.emit();
  }

  markEnded(): void {
    this.state = State.Ended;
    this.waitingListService.stopMonitoring();
    this.waitingListService.sortUsersByScore();
  }

}
