import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('sluggersApi', {
  getCharacters: (leagueId?: string) => ipcRenderer.invoke('db:getCharacters', leagueId),
  updatePlayer: (payload: any) => ipcRenderer.invoke('db:updatePlayer', payload),
  validateAndCreateLeague: (config: any) => ipcRenderer.invoke('league:validateAndCreate', config),
  confirmSpreadsheetImport: (payload: any) => ipcRenderer.invoke('importer:confirmImport', payload)
});