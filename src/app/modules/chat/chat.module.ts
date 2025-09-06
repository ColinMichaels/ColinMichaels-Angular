import {NgModule} from '@angular/core';
import {CommonModule} from '@angular/common';
import {FormsModule} from '@angular/forms';
import {FontAwesomeModule} from '@fortawesome/angular-fontawesome';
import {ChatBotComponent} from './chat.component';

@NgModule({
  declarations: [],
  imports: [
    CommonModule,
    FormsModule,
    FontAwesomeModule,
    ChatBotComponent
  ],
  exports: [
    ChatBotComponent
  ]
})
export class ChatModule {
}
