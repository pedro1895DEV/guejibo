import { Component, OnInit, Input } from '@angular/core';
import { State } from '../waiting-list/waiting-list.component';
import { NgClass } from '@angular/common';

export interface WaitingUser {
  name: string;
  online: boolean;
  finished: boolean;
  score: number;
}

@Component({
    selector: 'nr-waiting-user',
    templateUrl: './waiting-user.component.html',
    styleUrls: ['./waiting-user.component.scss'],
    imports: [NgClass]
})
export class WaitingUserComponent implements OnInit {
  @Input() user!: WaitingUser;
  @Input() state: State | string = State.Waiting;

  constructor() { }

  ngOnInit(): void {
    if (this.user && this.user.score === undefined) {
      this.user.score = 0;
    }
  }

  cssClass(): string[] {
    const css = ['status'];

    if (this.user.finished || this.state === State.Ended) {
      css.push('done');
    } else if (this.user.online) {
      css.push((this.state === State.Playing) ? 'score' : 'online');
    } else {
      css.push('offline');
    }

    return css;
  }

  statusText(): string {
    if (this.user.finished || this.state === State.Ended) {
      return this.user.score + ' ✔';
    }
    if (this.user.online) {
      return (this.state === State.Playing) ? this.user.score.toString() : 'online';
    }
    return (this.user.score === 0) ? 'offline' : this.user.score + ' (off)';
  }

}
