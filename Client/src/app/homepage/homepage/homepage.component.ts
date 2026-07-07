import { Component, OnInit } from '@angular/core';
import { HeaderComponent } from '../header/header.component';
import { GamebannersComponent } from '../gamebanners/gamebanners.component';

@Component({
    selector: 'app-homepage',
    templateUrl: './homepage.component.html',
    styleUrls: ['./homepage.component.scss'],
    imports: [HeaderComponent, GamebannersComponent]
})
export class HomepageComponent implements OnInit {

  constructor() { }

  ngOnInit(): void {
  }

}

