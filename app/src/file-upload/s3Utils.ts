/** @deprecated Use documentStorage / bunnyStorage instead. Kept for legacy imports. */
export {
  isBunnyStorageConfigured as isObjectStorageConfigured,
  getBunnyConfig,
} from '../server/storage/bunnyStorage';

export { getDocumentStorageStatus, storeDocumentFile, readDocumentFile } from '../server/storage/documentStorage';
