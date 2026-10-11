// The data layer's public surface. Screens import from here and never from Dexie directly,
// so a sync backend can later sit behind these same functions.
export { requestPersistentStorage } from './db'
export {
  addItem,
  addItems,
  deleteItem,
  getItem,
  listItems,
  purgeDeletedPhotos,
  restoreItem,
  updateItem,
  type ItemPatch,
  type NewItem,
} from './items'
export { deletePhoto, savePhoto, type NewPhoto } from './photos'
export { listWears, logWear, unlogWear } from './wears'
export { deleteOutfit, listOutfits, saveOutfit, updateOutfit } from './outfits'
export { DEFAULT_SETTINGS, getSettings, updateSettings } from './settings'
export {
  BackupError,
  backupFileName,
  createBackup,
  eraseEverything,
  parseBackup,
  restoreBackup,
  summarizeBackup,
  type BackupFile,
} from './backup'
export { hasSampleData, loadSampleData, removeSampleData } from './sample'
export { useHasSampleData, useItem, useItems, useOutfits, usePhotoUrl, useSettings, useWears } from './hooks'
