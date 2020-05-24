import { BrowserModule } from '@angular/platform-browser';
import { HttpClientModule } from '@angular/common/http';
import { NgModule } from '@angular/core';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { HeaderComponent } from './homepage/header/header.component';
import { TopbarComponent } from './topbar/topbar.component';
import { GamebannerComponent } from './homepage/gamebanner/gamebanner.component';
import { GamebannersComponent } from './homepage/gamebanners/gamebanners.component';
import { HomepageComponent } from './homepage/homepage/homepage.component';
import { GameScreenComponent } from './game-screen/game-screen/game-screen.component';
import { GameTitleComponent } from './game-screen/game-title/game-title.component';
import { ScreenshotComponent } from './game-screen/screenshot/screenshot.component';
import { MenuComponent } from './game-screen/menu/menu.component';
import { NewRoomComponent } from './new-room/new-room/new-room.component';
import { WaitingListComponent } from './new-room/waiting-list/waiting-list.component';
import { WaitingUserComponent } from './new-room/waiting-user/waiting-user.component';

@NgModule({
  declarations: [
    AppComponent,
    HeaderComponent,
    TopbarComponent,
    GamebannerComponent,
    GamebannersComponent,
    HomepageComponent,
    GameScreenComponent,
    GameTitleComponent,
    ScreenshotComponent,
    MenuComponent,
    NewRoomComponent,
    WaitingListComponent,
    WaitingUserComponent
  ],
  imports: [
    BrowserModule,
    AppRoutingModule,
    HttpClientModule
  ],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule { }
