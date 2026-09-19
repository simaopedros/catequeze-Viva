import AsyncStorage from '@react-native-async-storage/async-storage';

const RECENTS_KEY = 'catequis.bible.recents';
const FAVORITES_KEY = 'catequis.bible.favorites';
const FONT_KEY = 'catequis.reading.fontScale';

export type BibleRecent = { bookId: string; bookName: string; chapter: number; openedAt: string };
export type BibleFavorite = { bookId: string; bookName: string; chapter: number; verse: number; text: string };

async function readJson<T>(key: string, fallback: T): Promise<T> {
  try {
    const raw = await AsyncStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

export async function listRecents(): Promise<BibleRecent[]> {
  return readJson<BibleRecent[]>(RECENTS_KEY, []);
}

export async function pushRecent(entry: Omit<BibleRecent, 'openedAt'>): Promise<void> {
  const current = await listRecents();
  const next = [
    { ...entry, openedAt: new Date().toISOString() },
    ...current.filter((item) => !(item.bookId === entry.bookId && item.chapter === entry.chapter)),
  ].slice(0, 8);
  await AsyncStorage.setItem(RECENTS_KEY, JSON.stringify(next)).catch(() => undefined);
}

export async function listFavorites(): Promise<BibleFavorite[]> {
  return readJson<BibleFavorite[]>(FAVORITES_KEY, []);
}

export async function toggleFavorite(entry: BibleFavorite): Promise<boolean> {
  const current = await listFavorites();
  const exists = current.some((item) => item.bookId === entry.bookId && item.chapter === entry.chapter && item.verse === entry.verse);
  const next = exists
    ? current.filter((item) => !(item.bookId === entry.bookId && item.chapter === entry.chapter && item.verse === entry.verse))
    : [entry, ...current].slice(0, 200);
  await AsyncStorage.setItem(FAVORITES_KEY, JSON.stringify(next)).catch(() => undefined);
  return !exists;
}

export async function getFontScale(): Promise<number> {
  const raw = await AsyncStorage.getItem(FONT_KEY).catch(() => null);
  const parsed = raw ? Number(raw) : NaN;
  return Number.isFinite(parsed) ? parsed : 1;
}

export async function setFontScale(value: number): Promise<void> {
  await AsyncStorage.setItem(FONT_KEY, String(value)).catch(() => undefined);
}
