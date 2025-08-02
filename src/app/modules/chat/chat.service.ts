import {Injectable} from '@angular/core';
import {BehaviorSubject, Observable} from 'rxjs';

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

@Injectable({
  providedIn: 'root'
})
export class ChatBotService {
  private chatsSubject = new BehaviorSubject<Chat[]>([]);
  private messagesSubject = new BehaviorSubject<Message[]>([]);
  private currentUserSubject = new BehaviorSubject<User>({
    id: 'current-user',
    name: 'You',
    isOnline: true
  });

  chats$ = this.chatsSubject.asObservable();
  messages$ = this.messagesSubject.asObservable();
  currentUser$ = this.currentUserSubject.asObservable();

  constructor() {
    this.initializeData();
  }

  private initializeData() {
    // Initialize with sample data
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

    this.chatsSubject.next(sampleChats);
    this.messagesSubject.next(sampleMessages);
  }

  getChats(): Chat[] {
    return this.chatsSubject.value;
  }

  getMessages(): Message[] {
    return this.messagesSubject.value;
  }

  getMessagesForChat(chatId: string): Message[] {
    const chat = this.chatsSubject.value.find(c => c.id === chatId);
    if (!chat) return [];

    return this.messagesSubject.value.filter(m =>
      chat.participants.includes(m.senderId) || m.senderId === 'current-user'
    );
  }

  addMessage(message: Message) {
    const messages = this.messagesSubject.value;
    this.messagesSubject.next([...messages, message]);
  }

  addChat(chat: Chat) {
    const chats = this.chatsSubject.value;
    this.chatsSubject.next([chat, ...chats]);
  }

  updateChat(chatId: string, updates: Partial<Chat>) {
    const chats = this.chatsSubject.value.map(chat =>
      chat.id === chatId ? {...chat, ...updates} : chat
    );
    this.chatsSubject.next(chats);
  }

  addReactionToMessage(messageId: string, emoji: string, userId: string) {
    const messages = this.messagesSubject.value.map(message => {
      if (message.id === messageId) {
        if (!message.reactions) {
          message.reactions = [];
        }

        const existingReaction = message.reactions.find(r => r.emoji === emoji);
        if (existingReaction) {
          const userIndex = existingReaction.users.indexOf(userId);
          if (userIndex > -1) {
            existingReaction.users.splice(userIndex, 1);
            existingReaction.count--;
            if (existingReaction.count === 0) {
              message.reactions = message.reactions.filter(r => r.emoji !== emoji);
            }
          } else {
            existingReaction.users.push(userId);
            existingReaction.count++;
          }
        } else {
          message.reactions.push({
            emoji,
            count: 1,
            users: [userId]
          });
        }
      }
      return message;
    });

    this.messagesSubject.next(messages);
  }

  markChatAsRead(chatId: string) {
    this.updateChat(chatId, {unreadCount: 0});
  }

  simulateTyping(): Observable<boolean> {
    return new BehaviorSubject(false);
  }

  // WebSocket or real-time connection methods would go here
  connectToRealTime() {
    // Implementation for real-time messaging
  }

  disconnectFromRealTime() {
    // Implementation for disconnecting
  }
}
