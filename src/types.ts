export interface Seat {
  id: string;
  row: string;
  number: number;
  status: 'available' | 'locked' | 'sold';
  isVIP?: boolean;
  lockedBy?: string;
  lockedAt?: any;
  orderId?: string;
  session: string;
}

export interface Order {
  id?: string;
  userId: string;
  parentName: string;
  studentName: string;
  studentClass: string;
  studentName2?: string;
  studentClass2?: string;
  studentName3?: string;
  studentClass3?: string;
  email: string;
  ticketType: string;
  sessions: string[];
  seats: string[];
  totalAmount: number;
  status: 'pending' | 'paid' | 'cancelled';
  paymentProof?: string;
  createdAt: string;
  expiresAt?: string;
  checkedIn?: boolean;
  checkedInAt?: string;
}

export interface TicketType {
  id: string;
  name: string;
  price: number;
  description: string;
  sessions: string[];
  availableFrom: string;
  availableUntil?: string;
  isPublic?: boolean;
}

export interface TicketConfig {
  id: string;
  availableFrom: string;
  availableUntil: string;
  isPublic?: boolean;
}
