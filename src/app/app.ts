import { Component, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { JumpCounter } from './jump-counter/jump-counter';

@Component({
  selector: 'app-root',
  imports: [JumpCounter],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {
  protected readonly title = signal('jump-rope-counter');
}
