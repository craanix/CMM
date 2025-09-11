
export enum Role {
  ADMIN = 'ADMIN',
  TECHNICIAN = 'TECHNICIAN',
}

export enum MachineStatus {
  OK = 'OK',
  WARNING = 'WARNING',
  ERROR = 'ERROR',
}

export interface User {
  id: string;
  name: string;
  login: string;
  password?: string; // Should not be sent to client in a real app
  role: Role;
  regionId: string | null;
  region?: Region | null;
}

export interface Region {
  id: string;
  name: string;
}

export interface Point {
  id:string;
  name:string;
  address: string;
  regionId: string;
}

export interface Machine {
  id: string;
  name: string;
  serialNumber: string;
  regionId: string;
  pointId: string | null;
  status: MachineStatus;
}

export interface Part {
  id: string;
  name: string;
  sku: string;
}

export interface UsedPart {
  partId: string;
  quantity: number;
}

export interface MaintenanceRecord {
  id: string;
  machineId: string;
  userId: string;
  timestamp: string;
  description: string;
  usedParts: UsedPart[];
}

export interface AllData {
  regions: Region[],
  points: Point[],
  machines: Machine[],
  users: User[],
  maintenanceRecords: MaintenanceRecord[],
  parts: Part[],
}

export interface ImportSummary {
    created: number;
    updated: number;
    errors: string[];
}
