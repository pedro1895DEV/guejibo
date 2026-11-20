import { Routes } from '@angular/router';
import { authGuard } from './auth/auth.guard';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./homepage/homepage/homepage.component').then(m => m.HomepageComponent)
  },
  {
    path: 'game/:id',
    loadComponent: () => import('./game-screen/game-screen/game-screen.component').then(m => m.GameScreenComponent)
  },
  {
    path: 'newroom/:gameid',
    loadComponent: () => import('./new-room/new-room/new-room.component').then(m => m.NewRoomComponent),
    canActivate: [authGuard]
  },
  {
    path: 'myrooms',
    loadComponent: () => import('./my-rooms/my-rooms.component').then(m => m.MyRoomsComponent),
    canActivate: [authGuard]
  },
  {
    path: 'join',
    loadComponent: () => import('./join-screen/join-screen/join-screen.component').then(m => m.JoinScreenComponent)
  },
  {
    path: 'register',
    loadComponent: () => import('./auth/register-screen/register-screen.component').then(m => m.RegisterScreenComponent)
  },
  {
    path: 'logout',
    loadComponent: () => import('./auth/logout/logout.component').then(m => m.LogoutComponent)
  },
  {
    path: 'login',
    loadComponent: () => import('./auth/login/login.component').then(m => m.LoginComponent)
  },
  {
    path: '**',
    loadComponent: () => import('./homepage/homepage/homepage.component').then(m => m.HomepageComponent)
  }
];
