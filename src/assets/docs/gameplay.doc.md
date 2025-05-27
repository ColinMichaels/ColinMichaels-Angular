# Game Design Document (GDD)

**Project Name:** Colinos OS  
**Genre:** OS Simulator / Puzzle Adventure / ARG  
**Platform:** Web (Angular/NestJS stack)  
**Target Audience:** Tech-savvy users, puzzle solvers, developers, ARG fans

---

## 1. Game Overview
**Description:**  
*Colinos OS* simulates an evolving operating system in the browser. The player navigates a command-line and GUI environment to uncover hidden data, solve cryptic puzzles, and access deeper layers of reality. Mini-games, story fragments, and hidden files reward exploration and unlock new commands and system tools.

---

## 2. Core Gameplay

### Interface

- cli (Command Line Interface)
- GUI (File Manager, Task Manager, App Icons)
- Pseudo-apps (Notes, Mail, Logs, AI Chat, Browser clone)

### User Inputs
- Typed commands
- Click interactions (open files, drag apps, playNote games)
- Password entries / brute-force / code injections

### Command System (Initial Sample)

| Command       | Function                                  |
|---------------|-------------------------------------------|
| `help`        | Lists available commands                  |
| `ls`          | Lists contents of current directory       |
| `cd`          | Change directory                          |
| `open <file>` | Opens text/log/image file                 |
| `run <app>`   | Launches an application                   |
| `chat ai`     | Initiates AI Assistant conversation       |
| `decrypt`     | Attempts to decrypt protected file        |
| `unlock`      | Checks if access requirements are met     |

---

## 3. Level Design and Progression

Each level simulates a deeper system layer with new clues, puzzles, commands, and interface changes.

| Level | Theme               | Unlocks                     | Puzzle Concept                  |
|-------|---------------------|-----------------------------|---------------------------------|
| 0     | Boot/Login          | Basic cli access            | Guess login / brute-force trail |
| 1     | Data Recovery       | `open`, `decrypt`           | Corrupted file hints password   |
| 2     | Ghost User Detected | Chat app, new user logs     | Reverse lookup in user logs     |
| 3     | AI Integration      | `chat ai`, dynamic hints    | AI responds to keywords only    |
| 4     | Matrix Node         | Hidden sub-OS / game unlock | Console reboots into fake OS    |

---

## 4. AI Assistant (AI Chat)
- Cryptic helper (evolves with level)
- Sometimes misleading, often mysterious
- May unlock new clues when prompted correctly

---

## 5. Mini-Games and Hidden Features

| Name             | Description                             | Access                |
|------------------|-----------------------------------------|------------------------|
| Firewall Breaker | Brick breaker to crack encryption       | Level 2 hidden app     |
| Echo Chat        | Talk to past players’ messages          | Level 3 folder         |
| CodeGolf         | Shortest command solution challenges    | Post-Level 4           |
| Matrix Shell     | Recursive OS with inverted logic        | Endgame unlock         |

---

## 6. Scoring and Progression
- **Points**: Completing tasks, solving puzzles, finding Easter eggs
- **Unlockables**: New commands, themes, sound effects, wallpapers
- **Levels**: Gate features and narrative progress via score checkpoints

---

## 7. Narrative Elements
- Files, emails, corrupted images reveal a layered story
- Central mystery around a rogue AI and hidden system developer
- Final level reveals “truth” and player’s identity role in the system

---

## 8. Visual and UX Style
- TailwindCSS styled to mimic a hybrid of macOS + Linux terminal
- Theme toggles: Light / Dark / Retro Green / Red Alert
- Sounds: Keyboard typing, OS boot, error pings, tape loading FX

---

## 9. Tech Stack

| Layer         | Tech                           |
|---------------|--------------------------------|
| Frontend      | Angular + TailwindCSS          |
| Backend       | NestJS + Prisma                |
| Storage       | Firebase or Supabase           |
| Auth          | JWT with roles (PLAYER, ADMIN) |
| Config System | JSON-driven, modular           |
| Real-time     | Firebase RTDB or WebSocket     |

---

## 10. Development Phases

| Phase   | Goals                                    |
|---------|------------------------------------------|
| Phase 1 | cli shell, command parsing, level system |
| Phase 2 | File explorer UI, AI assistant           |
| Phase 3 | Add puzzles, unlockables, game logic     |
| Phase 4 | Mini-games, hidden levels, endgame shell |
| Phase 5 | Full polish, theme system, deployment    |

