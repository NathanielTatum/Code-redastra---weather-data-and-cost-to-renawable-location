
export type Author = 'user' | 'bot';

export interface Message {
  id: string;
  text: string;
  author: Author;
}
