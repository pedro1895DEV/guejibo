import { Component, OnInit } from '@angular/core';
import { NgIf } from '@angular/common';
import { RegisterFormComponent } from '../register-form/register-form.component';
import { RegisterSuccessComponent } from '../register-success/register-success.component';

enum Display { Form, Success };

@Component({
    selector: 'app-register-screen',
    templateUrl: './register-screen.component.html',
    styleUrls: ['./register-screen.component.scss'],
    imports: [NgIf, RegisterFormComponent, RegisterSuccessComponent]
})
export class RegisterScreenComponent implements OnInit {
  DisplayEnum = Display;

  public display: Display = Display.Form;

  constructor() { }

  ngOnInit(): void {
  }

  onSuccess() {
    this.display = Display.Success;
  }

}

