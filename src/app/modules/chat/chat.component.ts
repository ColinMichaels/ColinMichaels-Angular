import {Component, ElementRef, ViewChild, signal, computed} from '@angular/core';
import {CommonModule} from '@angular/common';
import {FormsModule} from '@angular/forms';
import {FontAwesomeModule} from '@fortawesome/angular-fontawesome';
import {
  faImage,
  faPaperPlane,
  faSmile,
  faPlus,
  faPhone,
  faVideo,
  faInfo,
  faUsers
} from '@fortawesome/free-solid-svg-icons';
import {RealtimeDbService} from '../../services/firebase/realtime-db.service';

export interface Message {
  id: string;
  text: string;
  senderId: string;
  senderName: string;
  timestamp: Date;
  isOwn: boolean;
  image?: string;
  reactions?: { emoji: string; count: number; users: string[] }[];
}

export interface Chat {
  id: string;
  name: string;
  participants: string[];
  lastMessage?: Message;
  unreadCount: number;
  isGroup: boolean;
  avatar?: string;
  isOnline?: boolean;
}

export interface User {
  id: string;
  name: string;
  avatar?: string;
  isOnline: boolean;
}

@Component({
  selector: 'app-chat-bot',
  standalone: true,
  imports: [CommonModule, FormsModule, FontAwesomeModule],
  template: `
    <div class="flex h-screen bg-gray-100 overflow-hidden rounded-lg shadow-2xl">
      <!-- Sidebar -->
      <div class="w-80 bg-white border-r border-gray-200 flex flex-col">
        <!-- Header -->
        <div class="p-4 border-b border-gray-200 bg-gray-50">
          <div class="flex items-center justify-between">
            <h1 class="text-xl font-semibold text-gray-800">Messages</h1>
            <button
              (click)="showNewChatModal = true"
              class="p-2 rounded-full hover:bg-gray-200 transition-colors">
              <fa-icon [icon]="faPlus" class="text-gray-600"></fa-icon>
            </button>
          </div>
        </div>

        <!-- Chat List -->
        <div class="flex-1 overflow-y-auto">
          <div
            *ngFor="let chat of chats()"
            (click)="selectChat(chat)"
            class="p-3 border-b border-gray-100 hover:bg-blue-50 cursor-pointer transition-colors"
            [class.bg-blue-100]="selectedChat().id === chat.id">
            <div class="flex items-center space-x-3">
              <div class="relative">
                <div
                  class="w-12 h-12 rounded-full bg-gradient-to-r from-blue-400 to-blue-600 flex items-center justify-center text-white font-semibold">
                  <span *ngIf="!chat.avatar">{{ chat.name.charAt(0).toUpperCase() }}</span>
                  <img *ngIf="chat.avatar" [src]="chat.avatar" class="w-full h-full rounded-full object-cover"/>
                </div>
                <div
                  *ngIf="chat.isOnline && !chat.isGroup"
                  class="absolute -bottom-1 -right-1 w-4 h-4 bg-green-400 border-2 border-white rounded-full">
                </div>
              </div>

              <div class="flex-1 min-w-0">
                <div class="flex items-center justify-between">
                  <h3 class="font-medium text-gray-900 truncate">{{ chat.name }}</h3>
                  <span class="text-xs text-gray-500">
                    {{ formatTime(chat.lastMessage?.timestamp) }}
                  </span>
                </div>
                <p class="text-sm text-gray-600 truncate">
                  {{ chat.lastMessage?.text || 'No messages yet' }}
                </p>
              </div>

              <div *ngIf="chat.unreadCount > 0"
                   class="bg-blue-500 text-white text-xs rounded-full px-2 py-1 min-w-[20px] text-center">
                {{ chat.unreadCount }}
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Main Chat Area -->
      <div class="flex-1 flex flex-col bg-white" *ngIf="selectedChat(); else noChat">
        <!-- Chat Header -->
        <div class="p-4 border-b border-gray-200 bg-gray-50">
          <div class="flex items-center justify-between">
            <div class="flex items-center space-x-3">
              <div class="relative">
                <div
                  class="w-10 h-10 rounded-full bg-gradient-to-r from-blue-400 to-blue-600 flex items-center justify-center text-white font-semibold">
                  <span *ngIf="!selectedChat()?.avatar">{{ selectedChat().name }}</span>
                  <img *ngIf="selectedChat()?.avatar" [src]="selectedChat().avatar"
                       class="w-full h-full rounded-full object-cover"/>
                </div>
                <div
                  *ngIf="selectedChat()?.isOnline && !selectedChat()?.isGroup"
                  class="absolute -bottom-1 -right-1 w-3 h-3 bg-green-400 border-2 border-white rounded-full">
                </div>
              </div>
              <div>
                <h2 class="font-semibold text-gray-900">{{ selectedChat().name }}</h2>
                <p class="text-xs text-gray-500" *ngIf="selectedChat()?.isGroup">
                  {{ selectedChat() ? selectedChat().participants.length : 0 }} participants
                </p>
                <p class="text-xs text-green-500" *ngIf="!selectedChat()?.isGroup && selectedChat()?.isOnline">
                  Online
                </p>
              </div>
            </div>

            <div class="flex space-x-2">
              <button class="p-2 rounded-full hover:bg-gray-200 transition-colors">
                <fa-icon [icon]="faPhone" class="text-gray-600"></fa-icon>
              </button>
              <button class="p-2 rounded-full hover:bg-gray-200 transition-colors">
                <fa-icon [icon]="faVideo" class="text-gray-600"></fa-icon>
              </button>
              <button
                *ngIf="selectedChat()?.isGroup"
                (click)="showGroupInfo = true"
                class="p-2 rounded-full hover:bg-gray-200 transition-colors">
                <fa-icon [icon]="faUsers" class="text-gray-600"></fa-icon>
              </button>
              <button class="p-2 rounded-full hover:bg-gray-200 transition-colors">
                <fa-icon [icon]="faInfo" class="text-gray-600"></fa-icon>
              </button>
            </div>
          </div>
        </div>

        <!-- Messages Area -->
        <div #messagesContainer class="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
          <div *ngFor="let message of currentMessages()" class="flex"
               [ngClass]="{'justify-end': message.isOwn, 'justify-start': !message.isOwn}">
            <div class="max-w-[70%] group">
              <div class="flex items-end space-x-2"
                   [ngClass]="{'flex-row-reverse space-x-reverse': message.isOwn}">

                <!-- Avatar for non-own messages -->
                <div *ngIf="!message.isOwn"
                     class="w-8 h-8 rounded-full bg-gradient-to-r from-gray-400 to-gray-600 flex items-center justify-center text-white text-sm font-semibold flex-shrink-0">
                  {{ message.senderName.charAt(0).toUpperCase() }}
                </div>

                <div class="flex flex-col space-y-1">
                  <!-- Sender name for group chats -->
                  <div *ngIf="!message.isOwn && selectedChat()?.isGroup"
                       class="text-xs text-gray-500 px-3">
                    {{ message.senderName }}
                  </div>

                  <!-- Message bubble -->
                  <div class="rounded-2xl px-4 py-2 max-w-md break-words"
                       [ngClass]="{
                         'bg-blue-500 text-white': message.isOwn,
                         'bg-white border border-gray-200 text-gray-900': !message.isOwn
                       }">

                    <!-- Image attachment -->
                    <div *ngIf="message.image" class="mb-2">
                      <img [src]="message.image"
                           class="rounded-lg max-w-full h-auto cursor-pointer"
                           (click)="openImageModal(message.image)"/>
                    </div>

                    <!-- Message text -->
                    <div *ngIf="message.text">{{ message.text }}</div>

                    <!-- Reactions -->
                    <div *ngIf="message.reactions && message.reactions.length > 0"
                         class="flex space-x-1 mt-2">
                      <span *ngFor="let reaction of message.reactions"
                            class="bg-gray-100 text-gray-800 px-2 py-1 rounded-full text-xs cursor-pointer hover:bg-gray-200"
                            (click)="toggleReaction(message, reaction.emoji)">
                        {{ reaction.emoji }} {{ reaction.count }}
                      </span>
                    </div>
                  </div>

                  <!-- Timestamp -->
                  <div class="text-xs text-gray-500 px-3"
                       [ngClass]="{'text-right': message.isOwn}">
                    {{ formatMessageTime(message.timestamp) }}
                  </div>
                </div>
              </div>

              <!-- Quick reactions on hover -->
              <div class="flex space-x-1 mt-1 opacity-0 group-hover:opacity-100 transition-opacity"
                   [ngClass]="{'justify-end': message.isOwn, 'justify-start': !message.isOwn}">
                <button *ngFor="let emoji of quickReactions"
                        (click)="addReaction(message, emoji)"
                        class="w-6 h-6 rounded-full bg-white border border-gray-200 hover:bg-gray-50 text-sm flex items-center justify-center">
                  {{ emoji }}
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- Message Input -->
        <div class="p-4 border-t border-gray-200 bg-white">
          <div class="flex items-end space-x-3">
            <!-- Image upload -->
            <button
              (click)="fileInput.click()"
              class="p-2 rounded-full hover:bg-gray-100 transition-colors flex-shrink-0">
              <fa-icon [icon]="faImage" class="text-gray-600"></fa-icon>
            </button>
            <input #fileInput type="file" accept="image/*" (change)="onImageSelect($event)" class="hidden">

            <!-- Message input -->
            <div class="flex-1 relative">
              <textarea
                [(ngModel)]="newMessage"
                (keydown)="onKeyDown($event)"
                placeholder="Type a message..."
                class="w-full resize-none rounded-full border border-gray-300 px-4 py-2 pr-12 focus:border-blue-500 focus:ring-blue-500 focus:outline-none min-h-[40px] max-h-32"
                rows="1"></textarea>

              <!-- Emoji button -->
              <button
                (click)="showEmojiPicker = !showEmojiPicker"
                class="absolute right-3 top-1/2 transform -translate-y-1/2 p-1 rounded-full hover:bg-gray-100 transition-colors">
                <fa-icon [icon]="faSmile" class="text-gray-600"></fa-icon>
              </button>

              <!-- Emoji picker -->
              <div *ngIf="showEmojiPicker"
                   class="absolute bottom-full right-0 mb-2 bg-white border border-gray-200 rounded-lg shadow-lg p-3 z-10">
                <div class="grid grid-cols-8 gap-1">
                  <button *ngFor="let emoji of emojis"
                          (click)="addEmoji(emoji)"
                          class="w-8 h-8 rounded hover:bg-gray-100 transition-colors flex items-center justify-center text-lg">
                    {{ emoji }}
                  </button>
                </div>
              </div>
            </div>

            <!-- Send button -->
            <button
              (click)="sendMessage()"
              [disabled]="!newMessage.trim()"
              class="p-2 rounded-full transition-colors flex-shrink-0"
              [ngClass]="{
                'bg-blue-500 hover:bg-blue-600 text-white': newMessage.trim(),
                'bg-gray-200 text-gray-400 cursor-not-allowed': !newMessage.trim()
              }">
              <fa-icon [icon]="faPaperPlane"></fa-icon>
            </button>
          </div>
        </div>
      </div>

      <!-- No chat selected -->
      <ng-template #noChat>
        <div class="flex-1 flex items-center justify-center bg-gray-50">
          <div class="text-center text-gray-500">
            <div class="text-6xl mb-4">💬</div>
            <h2 class="text-xl font-semibold mb-2">Select a conversation</h2>
            <p>Choose from your existing conversations or start a new one</p>
          </div>
        </div>
      </ng-template>
    </div>

    <!-- New Chat Modal -->
    <div *ngIf="showNewChatModal"
         class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
         (click)="showNewChatModal = false">
      <div class="bg-white rounded-lg p-6 w-96 max-w-full" (click)="$event.stopPropagation()">
        <h3 class="text-lg font-semibold mb-4">New Chat</h3>

        <div class="space-y-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Chat Name</label>
            <input
              [(ngModel)]="newChatName"
              type="text"
              placeholder="Enter chat name"
              class="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:ring-blue-500 focus:outline-none">
          </div>

          <div>
            <label class="flex items-center space-x-2">
              <input
                [(ngModel)]="newChatIsGroup"
                type="checkbox"
                class="rounded border-gray-300 text-blue-600 focus:ring-blue-500">
              <span class="text-sm text-gray-700">Group Chat</span>
            </label>
          </div>

          <div class="flex space-x-3 pt-4">
            <button
              (click)="createNewChat()"
              [disabled]="!newChatName.trim()"
              class="flex-1 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-300 text-white py-2 px-4 rounded-md transition-colors">
              Create
            </button>
            <button
              (click)="cancelNewChat()"
              class="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-700 py-2 px-4 rounded-md transition-colors">
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Image Modal -->
    <div *ngIf="selectedImage"
         class="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50"
         (click)="closeImageModal()">
      <div class="max-w-4xl max-h-full p-4">
        <img [src]="selectedImage" class="max-w-full max-h-full object-contain rounded-lg">
      </div>
    </div>

    <!-- Group Info Modal -->
    <div *ngIf="showGroupInfo"
         class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
         (click)="showGroupInfo = false">
      <div class="bg-white rounded-lg p-6 w-96 max-w-full" (click)="$event.stopPropagation()">
        <h3 class="text-lg font-semibold mb-4">Group Info</h3>

        <div class="space-y-4">
          <div class="text-center">
            <div
              class="w-16 h-16 rounded-full bg-gradient-to-r from-blue-400 to-blue-600 flex items-center justify-center text-white font-semibold text-xl mx-auto mb-2">
              {{ selectedChat() ? selectedChat().name.charAt(0).toUpperCase() : '' }}
            </div>
            <h4 class="font-semibold">{{ selectedChat().name }}</h4>
            <p class="text-sm text-gray-500">{{ selectedChat().participants.length }} participants</p>
          </div>

          <div>
            <h5 class="font-medium mb-2">Participants</h5>
            <div class="space-y-2">
              <div *ngFor="let participant of selectedChat()?.participants"
                   class="flex items-center space-x-3 p-2 rounded-lg hover:bg-gray-50">
                <div
                  class="w-8 h-8 rounded-full bg-gradient-to-r from-gray-400 to-gray-600 flex items-center justify-center text-white text-sm font-semibold">
                  {{ participant.charAt(0).toUpperCase() }}
                </div>
                <span class="text-sm">{{ participant }}</span>
              </div>
            </div>
          </div>

          <button
            (click)="showGroupInfo = false"
            class="w-full bg-gray-200 hover:bg-gray-300 text-gray-700 py-2 px-4 rounded-md transition-colors">
            Close
          </button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    :host {
      display: block;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
      font-size: 12px;
    }
  `]
})
export class ChatBotComponent {
  @ViewChild('messagesContainer') messagesContainer!: ElementRef;
  @ViewChild('fileInput') fileInput!: ElementRef;

  // Icons
  faImage = faImage;
  faPaperPlane = faPaperPlane;
  faSmile = faSmile;
  faPlus = faPlus;
  faPhone = faPhone;
  faVideo = faVideo;
  faInfo = faInfo;
  faUsers = faUsers;

  // Signals
  chats = signal<Chat[]>([]);
  selectedChat = signal<Chat>({} as Chat);
  messages = signal<Message[]>([]);
  currentMessages = computed(() => {
    const selected = this.selectedChat();
    if (!selected) return [];
    if (selected.participants) {
      return this.messages().filter(m =>
        selected.participants.includes(m.senderId) ?? m.senderId === 'current-user'
      );
    }

    return this.messages().filter(m => m.senderId === selected.id);

  });

  // Component state
  newMessage = '';
  showEmojiPicker = false;
  showNewChatModal = false;
  showGroupInfo = false;
  selectedImage: string | null = null;
  newChatName = '';
  newChatIsGroup = false;

  // Emojis
  emojis = ['😀', '😃', '😄', '😁', '😅', '😂', '🤣', '😊', '😇', '🙂', '🙃', '😉', '😌', '😍', '🥰', '😘', '😗', '😙', '😚', '😋', '😛', '😝', '😜', '🤪', '🤨', '🧐', '🤓', '😎', '🤩', '🥳', '😏', '😒', '😞', '😔', '😟', '😕', '🙁', '☹️', '😣', '😖', '😫', '😩', '🥺', '😢', '😭', '😤', '😠', '😡', '🤬', '🤯', '😳', '🥵', '🥶', '😱', '😨', '😰', '😥', '😓'];
  quickReactions = ['👍', '❤️', '😂', '😮', '😢', '😡'];

  constructor(private realTimeDb: RealtimeDbService) {
    this.realTimeDb.create('users', {
      id: 'current-user',
      name: 'You',
      avatar: 'https://avatars.dicebear.com/api/bottts/john-doe.svg',
      isOnline: true
    });
    this.initializeData();
  }

  initializeData() {
    // Sample chats
    const sampleChats: Chat[] = [
      {
        id: '1',
        name: 'John Doe',
        participants: ['john-doe'],
        unreadCount: 2,
        isGroup: false,
        isOnline: true,
        lastMessage: {
          id: '1',
          text: 'Hey! How are you doing?',
          senderId: 'john-doe',
          senderName: 'John Doe',
          timestamp: new Date(Date.now() - 300000),
          isOwn: false
        }
      },
      {
        id: '2',
        name: 'Work Team',
        participants: ['alice-smith', 'bob-wilson', 'carol-brown'],
        unreadCount: 0,
        isGroup: true,
        lastMessage: {
          id: '2',
          text: 'Great job on the presentation!',
          senderId: 'alice-smith',
          senderName: 'Alice Smith',
          timestamp: new Date(Date.now() - 3600000),
          isOwn: false
        }
      },
      {
        id: '3',
        name: 'Sarah Johnson',
        participants: ['sarah-johnson'],
        unreadCount: 0,
        isGroup: false,
        isOnline: false,
        lastMessage: {
          id: '3',
          text: 'Thanks for the help! 👍',
          senderId: 'current-user',
          senderName: 'You',
          timestamp: new Date(Date.now() - 7200000),
          isOwn: true
        }
      }
    ];

    sampleChats.forEach(chat => {
      this.realTimeDb.create('chats', chat);
    })

    // Sample messages
    const sampleMessages: Message[] = [
      {
        id: '1',
        text: 'Hey! How are you doing?',
        senderId: 'john-doe',
        senderName: 'John Doe',
        timestamp: new Date(Date.now() - 300000),
        isOwn: false
      },
      {
        id: '2',
        text: 'I\'m doing great! Just working on some new projects.',
        senderId: 'current-user',
        senderName: 'You',
        timestamp: new Date(Date.now() - 240000),
        isOwn: true
      },
      {
        id: '3',
        text: 'That sounds exciting! What kind of projects?',
        senderId: 'john-doe',
        senderName: 'John Doe',
        timestamp: new Date(Date.now() - 180000),
        isOwn: false
      },
      {
        id: '4',
        text: 'Mainly web development stuff. Building some Angular components.',
        senderId: 'current-user',
        senderName: 'You',
        timestamp: new Date(Date.now() - 120000),
        isOwn: true
      },
      {
        id: '5',
        text: 'Cool! I love Angular. Let me know if you need any help!',
        senderId: 'john-doe',
        senderName: 'John Doe',
        timestamp: new Date(Date.now() - 60000),
        isOwn: false,
        reactions: [
          {emoji: '👍', count: 1, users: ['current-user']}
        ]
      }
    ];

    this.chats.set(sampleChats);
    this.messages.set(sampleMessages);
  }

  selectChat(chat: Chat) {
    this.selectedChat.set(chat);
    // Mark as read
    chat.unreadCount = 0;
    this.chats.update(chats => [...chats]);

    setTimeout(() => this.scrollToBottom(), 100);
  }

  sendMessage() {
    if (!this.newMessage.trim() || !this.selectedChat()) return;

    const message: Message = {
      id: Date.now().toString(),
      text: this.newMessage,
      senderId: 'current-user',
      senderName: 'You',
      timestamp: new Date(),
      isOwn: true
    };

    this.messages.update(messages => [...messages, message]);

    // Update last message in chat
    const selected = this.selectedChat()!;
    selected.lastMessage = message;
    this.chats.update(chats => [...chats]);

    this.newMessage = '';
    this.showEmojiPicker = false;

    setTimeout(() => this.scrollToBottom(), 100);

    // Simulate a response
    this.simulateResponse();
  }

  simulateResponse() {
    setTimeout(() => {
      const responses = [
        "That's interesting!",
        "I see what you mean.",
        "Great point!",
        "Thanks for sharing that.",
        "I agree!",
        "That makes sense.",
        "Good to know!",
        "Absolutely!",
        "I understand.",
        "Thanks for the update!"
      ];

      const response: Message = {
        id: Date.now().toString(),
        text: responses[Math.floor(Math.random() * responses.length)],
        senderId: this.selectedChat()!.participants[0],
        senderName: this.selectedChat()!.name,
        timestamp: new Date(),
        isOwn: false
      };

      this.messages.update(messages => [...messages, response]);

      // Update last message in chat
      const selected = this.selectedChat()!;
      selected.lastMessage = response;
      this.chats.update(chats => [...chats]);

      setTimeout(() => this.scrollToBottom(), 100);
    }, 1000 + Math.random() * 2000);
  }

  onKeyDown(event: KeyboardEvent) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.sendMessage();
    }
  }

  addEmoji(emoji: string) {
    this.newMessage += emoji;
    this.showEmojiPicker = false;
  }

  onImageSelect(event: any) {
    const file = event.target.files[0];
    if (!file || !this.selectedChat()) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const imageUrl = e.target?.result as string;

      const message: Message = {
        id: Date.now().toString(),
        text: '',
        senderId: 'current-user',
        senderName: 'You',
        timestamp: new Date(),
        isOwn: true,
        image: imageUrl
      };

      this.messages.update(messages => [...messages, message]);

      // Update last message in chat
      const selected = this.selectedChat()!;
      selected.lastMessage = {...message, text: '📷 Photo'};
      this.chats.update(chats => [...chats]);

      setTimeout(() => this.scrollToBottom(), 100);
      this.simulateResponse();
    };

    reader.readAsDataURL(file);

    // Reset file input
    this.fileInput.nativeElement.value = '';
  }

  openImageModal(imageUrl: string) {
    this.selectedImage = imageUrl;
  }

  closeImageModal() {
    this.selectedImage = null;
  }

  addReaction(message: Message, emoji: string) {
    if (!message.reactions) {
      message.reactions = [];
    }

    const existingReaction = message.reactions.find(r => r.emoji === emoji);
    if (existingReaction) {
      const userIndex = existingReaction.users.indexOf('current-user');
      if (userIndex > -1) {
        existingReaction.users.splice(userIndex, 1);
        existingReaction.count--;
        if (existingReaction.count === 0) {
          message.reactions = message.reactions.filter(r => r.emoji !== emoji);
        }
      } else {
        existingReaction.users.push('current-user');
        existingReaction.count++;
      }
    } else {
      message.reactions.push({
        emoji,
        count: 1,
        users: ['current-user']
      });
    }

    this.messages.update(messages => [...messages]);
  }

  toggleReaction(message: Message, emoji: string) {
    this.addReaction(message, emoji);
  }

  createNewChat() {
    if (!this.newChatName.trim()) return;

    const newChat: Chat = {
      id: Date.now().toString(),
      name: this.newChatName,
      participants: [this.newChatName.toLowerCase().replace(/\s+/g, '-')],
      unreadCount: 0,
      isGroup: this.newChatIsGroup,
      isOnline: !this.newChatIsGroup && Math.random() > 0.5
    };

    this.chats.update(chats => [newChat, ...chats]);
    this.selectChat(newChat);
    this.cancelNewChat();
  }

  cancelNewChat() {
    this.showNewChatModal = false;
    this.newChatName = '';
    this.newChatIsGroup = false;
  }

  formatTime(date?: Date): string {
    if (!date) return '';

    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'now';
    if (minutes < 60) return `${minutes}m`;
    if (hours < 24) return `${hours}h`;
    if (days < 7) return `${days}d`;

    return date.toLocaleDateString();
  }

  formatMessageTime(date: Date): string {
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  }

  private scrollToBottom() {
    if (this.messagesContainer) {
      const element = this.messagesContainer.nativeElement;
      element.scrollTop = element.scrollHeight;
    }
  }
}
