import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import { HomepageComponent } from './homepage/homepage/homepage.component';
import { GameScreenComponent } from './game-screen/game-screen/game-screen.component';
import { NewRoomComponent } from './new-room/new-room/new-room.component';


const routes: Routes = [
  { path: '',                 component: HomepageComponent },
  { path: 'game/:id',         component: GameScreenComponent },
  { path: 'newroom/:gameid',  component: NewRoomComponent}
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
