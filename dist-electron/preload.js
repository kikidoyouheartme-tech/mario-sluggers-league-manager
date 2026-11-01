"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
electron_1.contextBridge.exposeInMainWorld('sluggersApi', {
    getCharacters: (leagueId) => electron_1.ipcRenderer.invoke('db:getCharacters', leagueId),
    updatePlayer: (payload) => electron_1.ipcRenderer.invoke('db:updatePlayer', payload),
    validateAndCreateLeague: (config) => electron_1.ipcRenderer.invoke('league:validateAndCreate', config),
    confirmSpreadsheetImport: (payload) => electron_1.ipcRenderer.invoke('importer:confirmImport', payload)
});
