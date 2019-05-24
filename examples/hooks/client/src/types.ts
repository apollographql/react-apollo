export interface Message {
  content: string;
}

export interface News {
  latestNews: Message;
}

export interface RocketInventory {
  id: number;
  model: string;
  year: number;
  stock: number;
}

export interface NewRocketDetails {
  model: string;
  year: number;
  stock: number;
}
