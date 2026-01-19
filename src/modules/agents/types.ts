export interface Agent {
  id: string;
  name: string;
  instructions: string;
  userId: string;
  createdAt: Date | string;
  updatedAt: Date | string;
  meetingsCount?: number;
}