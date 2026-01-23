export interface Member {
  id: string;
  name: string;
  avatar: string;
}

export interface Group {
  id: string;
  name: string;
  description: string;
  members: Member[];
  joinCode: string;
  progress: number;
  moqTarget: number;
  currentQuantity: number;
  status: 'active' | 'pending' | 'completed';
}