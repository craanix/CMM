import type { Region, Point, Machine, User, MaintenanceRecord, Part } from '../types';
import { Role } from '../types';

// Simulate network latency
const API_LATENCY = 150;

const delay = <T,>(data: T): Promise<T> => 
  new Promise(resolve => setTimeout(() => resolve(data), API_LATENCY));

const DB_KEY = 'cmm_db_session';

// --- DB Management ---
let dbPromise: Promise<any> | null = null;

const initDb = async () => {
  try {
    const sessionData = sessionStorage.getItem(DB_KEY);
    if (sessionData) {
      return JSON.parse(sessionData);
    }
    const response = await fetch('/db.json');
    if (!response.ok) {
        throw new Error('Network response was not ok');
    }
    const dbData = await response.json();
    sessionStorage.setItem(DB_KEY, JSON.stringify(dbData));
    return dbData;
  } catch (error) {
    console.error("Failed to initialize database:", error);
    // In a real app, you'd have more robust error handling.
    // For this simulation, we'll clear storage and try again next time.
    sessionStorage.removeItem(DB_KEY);
    throw error;
  }
};

const getDb = () => {
    if (!dbPromise) {
        dbPromise = initDb();
    }
    return dbPromise;
};

const readDb = async () => {
    try {
        return await getDb();
    } catch (error) {
        // If the first attempt fails, reset the promise to allow retrying
        dbPromise = null; 
        return Promise.reject(error);
    }
};


const writeDb = (data: any) => {
  sessionStorage.setItem(DB_KEY, JSON.stringify(data));
  // Invalidate the promise to ensure next read gets the new data
  dbPromise = Promise.resolve(data); 
};


// --- AUTH ---
export const login = async (login: string, password_unused: string): Promise<User | null> => {
  const data = await readDb();
  const user = data.users.find((u: User) => u.login.toLowerCase() === login.toLowerCase());
  return delay(user || null);
};

// --- DATA FETCHING ---
export const getAllDataForUser = async (user: User): Promise<any> => {
  const allData = await readDb();
  
  if (user.role === Role.ADMIN) {
    return delay(allData);
  }
  
  // Technician sees only their region's data
  if (user.role === Role.TECHNICIAN && user.regionId) {
    const regionId = user.regionId;
    const regions = allData.regions.filter((r: Region) => r.id === regionId);
    const points = allData.points.filter((p: Point) => p.regionId === regionId);
    const machines = allData.machines.filter((m: Machine) => m.regionId === regionId);
    const machineIds = machines.map((m: Machine) => m.id);
    const records = allData.maintenanceRecords.filter((rec: MaintenanceRecord) => machineIds.includes(rec.machineId));
    
    return delay({
      regions,
      points,
      machines,
      users: allData.users, // Tech might need to see user names on records
      parts: allData.parts,
      maintenanceRecords: records
    });
  }
  
  return delay(null);
};


export const getMachineDetails = async (machineId: string): Promise<{ machine: Machine, records: MaintenanceRecord[] } | null> => {
    const data = await readDb();
    const machine = data.machines.find((m: Machine) => m.id === machineId);
    if (!machine) return delay(null);

    const records = data.maintenanceRecords
        .filter((r: MaintenanceRecord) => r.machineId === machineId)
        .sort((a: MaintenanceRecord, b: MaintenanceRecord) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    return delay({ machine, records });
};

export const getAllParts = async (): Promise<Part[]> => {
    const data = await readDb();
    return delay(data.parts);
}

export const getAllUsers = async (): Promise<User[]> => {
  const data = await readDb();
  return delay(data.users);
}


// --- DATA MUTATION ---
export const addMaintenanceRecord = async (record: Omit<MaintenanceRecord, 'id' | 'timestamp'>): Promise<MaintenanceRecord> => {
    const data = await readDb();
    const newRecord: MaintenanceRecord = {
        ...record,
        id: `rec_${Date.now()}`,
        timestamp: new Date().toISOString(),
    };
    data.maintenanceRecords.push(newRecord);
    writeDb(data);
    return delay(newRecord);
};

// --- ADMIN FUNCTIONS ---
type EntityType = 'regions' | 'users' | 'points' | 'machines' | 'parts';

export const addEntity = async <T,>(entityType: EntityType, entityData: Omit<T, 'id'>): Promise<T> => {
    const data = await readDb();
    const newEntity = {
        ...entityData,
        id: `${entityType.slice(0, 3)}_${Date.now()}`,
    } as T;
    (data[entityType] as T[]).push(newEntity);
    writeDb(data);
    return delay(newEntity);
}

export const updateEntity = async <T extends {id: string}>(entityType: EntityType, updatedEntityData: Partial<T> & { id: string }): Promise<T> => {
    const data = await readDb();
    const items = data[entityType] as T[];
    const index = items.findIndex(e => e.id === updatedEntityData.id);
    if (index > -1) {
        // Merge existing data with new data to prevent overwriting fields
        const mergedEntity = { ...items[index], ...updatedEntityData };
        items[index] = mergedEntity;
        writeDb(data);
        return delay(mergedEntity);
    }
    throw new Error("Entity not found");
}


export const deleteEntity = async (entityType: EntityType, id: string): Promise<{id: string}> => {
    const data = await readDb();
    const initialLength = data[entityType].length;
    data[entityType] = data[entityType].filter((e: {id: string}) => e.id !== id);
    if (data[entityType].length === initialLength) {
      throw new Error("Entity not found for deletion");
    }
    writeDb(data);
    return delay({ id });
}