import {Component, ElementRef, ViewChild, ChangeDetectionStrategy} from '@angular/core';
import {CommonModule} from '@angular/common';
import {FormsModule} from '@angular/forms';

//
// Simple interfaces for Users, Messages, and Chats
//
interface User {
  id: number;
  name: string;
  avatarUrl: string;
}

interface Message {
  id: number;
  sender: User;
  content: string;      // textual content (including emojis)
  timestamp: Date;
  imageUrl?: string;    // if message is an image attachment
}

interface Chat {
  id: number;
  name: string;                     // chat name (for groups) or counterpart name (for 1:1)
  participants: User[];             // list of users in this chat
  messages: Message[];              // the history
  isGroup: boolean;
  avatarUrl?: string;               // if you want a single avatar for the chat
}

@Component({
  selector: 'app-messages',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="flex h-screen bg-gray-900 text-gray-100">

      <!-- Sidebar: List of Chats -->
      <aside class="w-72 border-r border-gray-800 flex-shrink-0 flex flex-col">
        <div class="px-4 py-2 text-xl font-semibold border-b border-gray-800">
          Messages
        </div>
        <div class="flex-1 overflow-y-auto">
          <ul>
            <li *ngFor="let chat of chatList">
              <button
                type="button"
                (click)="selectChat(chat)"
                [class.bg-gray-700]="selectedChat?.id === chat.id"
                [attr.aria-pressed]="selectedChat?.id === chat.id"
                class="flex w-full items-center px-4 py-3 text-left cursor-pointer hover:bg-gray-800 transition-colors"
              >
              <img
                *ngIf="chat.avatarUrl; else groupAvatars"
                [src]="chat.avatarUrl"
                alt="avatar"
                class="h-10 w-10 rounded-full object-cover"
              />
              <ng-template #groupAvatars>
                <!-- Show up to 2 avatars for group chats -->
                <div class="flex -space-x-2">
                  <img
                    *ngFor="let p of chat.participants | slice:0:2"
                    [src]="p.avatarUrl"
                    alt="avatar"
                    class="h-8 w-8 rounded-full border-2 border-gray-900 object-cover"
                  />
                </div>
              </ng-template>
              <div class="ml-3 flex-1">
                <div class="font-medium">
                  {{ chat.isGroup ? chat.name : chat.participants[0].name }}
                </div>
                <div class="text-sm text-gray-400 truncate">
                  {{ getLastMessagePreview(chat) }}
                </div>
              </div>
              <div *ngIf="getUnreadCount() > 0" class="ml-auto">
                <span
                  class="bg-blue-500 text-white text-xs font-semibold rounded-full px-2 py-0.5"
                  >{{ getUnreadCount() }}</span
                >
              </div>
              </button>
            </li>
          </ul>
        </div>
        <div class="px-4 py-2 border-t border-gray-800">
          <button
            (click)="createNewChat()"
            class="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg transition-colors"
          >
            + New Chat
          </button>
        </div>
      </aside>

      <!-- Main Chat Window -->
      <main class="flex-1 flex flex-col">
        <ng-container *ngIf="selectedChat; else noChatSelected">
          <!-- Chat Header -->
          <header class="flex items-center px-6 py-3 border-b border-gray-800">
            <img
              *ngIf="selectedChat.avatarUrl; else grpAvatarHeader"
              [src]="selectedChat.avatarUrl"
              alt="chat avatar"
              class="h-12 w-12 rounded-full object-cover"
            />
            <ng-template #grpAvatarHeader>
              <div class="flex -space-x-2">
                <img
                  *ngFor="let p of selectedChat.participants | slice: 0:2"
                  [src]="p.avatarUrl"
                  alt="avatar"
                  class="h-10 w-10 rounded-full border-2 border-gray-900 object-cover"
                />
              </div>
            </ng-template>

            <div class="ml-4 flex-1">
              <div class="text-lg font-semibold">
                {{ selectedChat.isGroup ? selectedChat.name : selectedChat.participants[0].name }}
              </div>

            </div>

            <!-- Example “info” button -->
            <button class="text-gray-400 hover:text-gray-200 transition-colors">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                class="h-6 w-6"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M13 16h-1v-4h-1m1-4h.01M12 20.5a8.5 8.5 0 100-17 8.5 8.5 0 000 17z"
                />
              </svg>
            </button>
          </header>

          <!-- Message List -->
          <div
            #messageContainer
            class="flex-1 overflow-y-auto px-6 py-4 space-y-4 bg-gray-900"
          >
            <div
              *ngFor="let msg of selectedChat.messages; let i = index"
              [class.justify-end]="msg.sender.id === currentUser.id"
              class="flex"
            >
              <!-- If the message is from someone else -->
              <ng-container *ngIf="msg.sender.id !== currentUser.id; else myMsg">
                <img
                  [src]="msg.sender.avatarUrl"
                  alt="avatar"
                  class="h-8 w-8 rounded-full mt-1"
                />
                <div class="ml-2 max-w-[70%]">
                  <div class="bg-gray-800 text-gray-100 px-3 py-1.5 rounded-xl inline-block">
                    <ng-container *ngIf="msg.imageUrl">
                      <img
                        [src]="msg.imageUrl"
                        alt="attached"
                        class="max-w-full rounded-md mb-1"
                      />
                    </ng-container>
                    <div class="whitespace-pre-wrap">{{ msg.content }}</div>
                  </div>
                  <div class="text-xs text-gray-500 ml-1 mt-0.5">
                    {{ msg.timestamp | date: 'shortTime' }}
                  </div>
                </div>
              </ng-container>

              <!-- If the message is mine -->
              <ng-template #myMsg>
                <div class="flex-1"></div>
                <div class="max-w-[70%] text-right">
                  <div class="bg-blue-500 text-white px-3 py-1.5 rounded-xl inline-block">
                    <ng-container *ngIf="msg.imageUrl">
                      <img
                        [src]="msg.imageUrl"
                        alt="attached"
                        class="max-w-full rounded-md mb-1"
                      />
                    </ng-container>
                    <div class="whitespace-pre-wrap">{{ msg.content }}</div>
                  </div>
                  <div class="text-xs text-gray-400 mt-0.5">
                    {{ msg.timestamp | date: 'shortTime' }}
                  </div>
                </div>
              </ng-template>
            </div>
          </div>

          <!-- Input Area -->
          <footer class="px-6 py-3 border-t border-gray-800 flex items-center space-x-2">
            <!-- Emoji button (just a trigger, you can integrate an emoji‐picker library here) -->
            <button
              (click)="toggleEmojiPicker()"
              class="text-2xl hover:bg-gray-800 p-1 rounded-full transition-colors"
            >
              😊
            </button>

            <!-- File input (hidden) -->
            <input
              #fileInput
              type="file"
              accept="image/*"
              (change)="onFileSelected($event)"
              class="hidden"
            />
            <button
              (click)="fileInput.click()"
              class="text-gray-400 hover:text-gray-200 transition-colors"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                class="h-6 w-6"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M4 16v1a2 2 0 002 2h12a2 2 0 002-2v-1M4 12l8-8 8 8M12 4v16"
                />
              </svg>
            </button>

            <!-- Text input -->
            <input
              [(ngModel)]="draftMessage"
              (keydown.enter)="sendMessage()"
              type="text"
              placeholder="iMessage"
              class="flex-1 bg-gray-800 placeholder-gray-500 text-gray-100 px-4 py-2 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500"
            />

            <!-- Send button -->
            <button
              (click)="sendMessage()"
              class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-full transition-colors"
            >
              Send
            </button>
          </footer>
        </ng-container>

        <!-- Fallback when no chat is selected -->
        <ng-template #noChatSelected>
          <div class="flex-1 flex items-center justify-center text-gray-500">
            Select a chat to start messaging
          </div>
        </ng-template>
      </main>
    </div>

    <!-- Simple Emoji Picker Dropdown (basic) -->
    <div
      *ngIf="showEmojiPicker"
      class="absolute bottom-20 right-8 bg-gray-800 border border-gray-700 rounded-lg p-2 grid grid-cols-6 gap-2"
    >
      <button
        *ngFor="let emo of emojiList"
        type="button"
        (click)="addEmoji(emo)"
        [attr.aria-label]="'Add ' + emo + ' emoji'"
        class="cursor-pointer text-2xl hover:bg-gray-700 rounded-md p-1 transition-colors"
      >{{ emo }}</button>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.Eager,
  styles: [],
})
export class MessagesComponent {
  @ViewChild('messageContainer') private messageContainer!: ElementRef;
  @ViewChild('fileInput') private fileInput!: ElementRef<HTMLInputElement>;

  // Simulate a “logged‐in” user
  currentUser: User = {
    id: 1,
    name: 'You',
    avatarUrl: 'https://i.pravatar.cc/150?img=3', // placeholder
  };

  // Sample other users
  userAlice: User = {id: 2, name: 'Alice', avatarUrl: 'https://i.pravatar.cc/150?img=4'};
  userBob: User = {id: 3, name: 'Bob', avatarUrl: 'https://i.pravatar.cc/150?img=5'};
  userCarol: User = {id: 4, name: 'Carol', avatarUrl: 'https://i.pravatar.cc/150?img=6'};

  // Sample chats
  chatList: Chat[] = [
    {
      id: 101,
      name: '',
      participants: [this.userAlice],
      messages: [
        {
          id: 1,
          sender: this.userAlice,
          content: 'Hey, how are you?',
          timestamp: new Date(new Date().getTime() - 1000 * 60 * 60),
        },
        {
          id: 2,
          sender: this.currentUser,
          content: 'I’m good—just testing out this new chat UI!',
          timestamp: new Date(new Date().getTime() - 1000 * 60 * 30),
        },
      ],
      isGroup: false,
      avatarUrl: '', // if blank, it will show participant’s avatar
    },
    {
      id: 102,
      name: 'Friends Group',
      participants: [this.currentUser, this.userBob, this.userCarol],
      messages: [
        {
          id: 1,
          sender: this.userBob,
          content: 'Anyone up for lunch today? 😊',
          timestamp: new Date(new Date().getTime() - 1000 * 60 * 120),
        },
        {
          id: 2,
          sender: this.userCarol,
          content: "Count me in! 🍕",
          timestamp: new Date(new Date().getTime() - 1000 * 60 * 90),
        },
      ],
      isGroup: true,
      avatarUrl: '', // group avatar can be custom, otherwise show combined avatars
    },
  ];

  selectedChat: Chat | null = null;
  draftMessage: string = '';
  showEmojiPicker = false;

  // A small set of emojis for the basic picker
  emojiList = ['😀', '😂', '😍', '🤔', '🙌', '👍', '🐱', '🎉', '❤️', '🔥', '😎', '🤷‍♂️'];

  constructor() {
    // Select the first chat by default
    this.selectedChat = this.chatList[0];
    // Scroll to bottom on load
    setTimeout(() => this.scrollToBottom(), 0);
  }

  /**** Helper Methods ****/

  selectChat(chat: Chat) {
    this.selectedChat = chat;
    this.scrollToBottom();
  }

  getLastMessagePreview(chat: Chat): string {
    if (!chat.messages.length) return 'No messages yet';
    const last = chat.messages[chat.messages.length - 1];
    return (last.sender.id === this.currentUser.id ? 'You: ' : `${last.sender.name}: `) +
      (last.content.length > 20 ? last.content.slice(0, 20) + '…' : last.content);
  }

  getUnreadCount(): number {
    // For demo purposes, just zero
    return 0;
  }

  /** Sends the message (with optional image). */
  sendMessage() {
    if (!this.selectedChat) return;
    if (!this.draftMessage.trim() && !this.pendingImageBase64) {
      return;
    }

    const newMsg: Message = {
      id: Date.now(),
      sender: this.currentUser,
      content: this.draftMessage,
      timestamp: new Date(),
    };

    if (this.pendingImageBase64) {
      newMsg.imageUrl = this.pendingImageBase64;
      this.pendingImageBase64 = null;
    }

    this.selectedChat.messages.push(newMsg);
    this.draftMessage = '';
    this.scrollToBottom();
  }

  /** When the user picks an image file, convert it to base64 and store. */
  pendingImageBase64: string | null = null;

  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (!input.files?.length) return;

    const file = input.files[0];
    const reader = new FileReader();
    reader.onload = () => {
      this.pendingImageBase64 = reader.result as string;
      // Immediately send as an image message (optional: you could wait for “Send” click)
      this.sendMessage();
      // Clear the file input
      this.fileInput.nativeElement.value = '';
    };
    reader.readAsDataURL(file);
  }

  /** Emoji picker toggling */
  toggleEmojiPicker() {
    this.showEmojiPicker = !this.showEmojiPicker;
  }

  addEmoji(emo: string) {
    this.draftMessage += emo;
    this.showEmojiPicker = false;
  }

  /** Always scroll message list to bottom on new message */
  scrollToBottom() {
    try {
      const el = this.messageContainer.nativeElement as HTMLElement;
      setTimeout(() => {
        el.scrollTop = el.scrollHeight;
      }, 50);
    } catch {
      return;
    }
  }

  /** Creates a brand new one-to-one chat with Alice (demo only) */
  createNewChat() {
    const newId = Math.floor(Math.random() * 10000) + 200;
    const newChat: Chat = {
      id: newId,
      name: '',
      participants: [this.userAlice],
      messages: [],
      isGroup: false,
      avatarUrl: '',
    };
    this.chatList.push(newChat);
    this.selectChat(newChat);
  }
}
