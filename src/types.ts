export type UserRole = 'admin' | 'user';

export interface UserProfile {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  created_at?: string;
}

export interface Location {
  id: string;
  name: string;
  description: string;
}

export interface Item {
  id: string;
  code: string;
  name: string;
  category: string;
  description: string;
  total_qty: number;
  available_qty: number;
  min_qty: number;
  unit: string;
  location_id: string;
  status: 'disponível' | 'em uso' | 'estoque baixo' | 'em manutenção' | 'indisponível' | 'danificado';
  notes?: string;
  location?: Location;
}

export interface Movement {
  id: string;
  item_id: string;
  user_id: string;
  type: 'check-in' | 'check-out';
  quantity: number;
  timestamp: string;
  item?: Item;
  profile?: UserProfile;
}

export interface Alert {
  id: string;
  item_id: string;
  message: string;
  is_read: boolean;
  created_at: string;
  item?: Item;
}
