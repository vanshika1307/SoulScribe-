export interface TodoItem {
  id: string;
  text: string;
  completed: boolean;
}

export interface Sticker {
  id: string;
  imageUrl: string;
  x: number;
  y: number;
  rotation: number;
  scale: number;
  type: 'sticker' | 'washi';
}

export interface JournalEntry {
  id: string;
  date: string;
  content: string;
  todos: TodoItem[];
  stickers: Sticker[];
}

export enum GeneratorMode {
  None,
  Prompts,
  Sticker,
  Washi
}

export interface GeneratedAsset {
  data: string; // Base64 or URL
  mimeType: string;
}