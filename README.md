# Mario Super Sluggers League Manager (Windows Desktop Application)

A complete offline-capable Windows franchise & league management application built with **Electron**, **React**, **TypeScript**, and **SQLite (`better-sqlite3`)** for **Mario Super Sluggers**.

## 1. Initial Setup & Asset Extraction
1. Ensure all project files are placed inside `D:\mario-sluggers-league-manager`.
2. Extract `mariosl.zip` into `D:\mario-sluggers-league-manager\public\mariosl\` so that:
   - Individual character portraits are at `public/mariosl/characters/*.png`
   - Sprite sheets are at `public/mariosl/characters/charactericons.png`, `captainportraits.png`, and `teamlogosicons.png`
   - Stadium backgrounds are at `public/mariosl/stadium/stadiumbackgrounds/*.png`
3. Install dependencies and launch in development mode:
   ```powershell
   npm install
   npm run dev