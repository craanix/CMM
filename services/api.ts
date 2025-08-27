import type { Region, Point, Machine, User, MaintenanceRecord, Part } from '../types';

const API_BASE_URL = '/api'; // Using a relative URL for proxying

const getAuthToken = (): string | null => {
    return localStorage.getItem('cmm_token');
}

const getHeaders = () => {
    const token = getAuthToken();
    const headers: HeadersInit = {
        'Content-Type': 'application/json',
    };
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }
    return headers;
}

const handleResponse = async (response: Response) => {
    if (!response.ok) {
        const error = await response.json().catch(() => ({ message: response.statusText }));
        throw new Error(error.message || 'An unknown error occurred');
    }
    return response.json();
}

// --- AUTH ---
export const login = async (login: string, password_unused: string): Promise<{token: string, user: User}> => {
    const response = await fetch(`${API_BASE_URL}/auth/login`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ login, password: password_unused }),
    });
    return handleResponse(response);
};

export const getMe = async (): Promise<User> => {
    const response = await fetch(`${API_BASE_URL}/auth/me`, { headers: getHeaders() });
    return handleResponse(response);
}


// --- DATA FETCHING ---
export const getAllDataForUser = async (): Promise<any> => {
    const response = await fetch(`${API_BASE_URL}/data`, { headers: getHeaders() });
    return handleResponse(response);
};


export const getMachineDetails = async (machineId: string): Promise<{ machine: Machine, records: MaintenanceRecord[] }> => {
    const response = await fetch(`${API_BASE_URL}/machines/${machineId}/details`, { headers: getHeaders() });
    return handleResponse(response);
};

export const getAllParts = async (): Promise<Part[]> => {
    const response = await fetch(`${API_BASE_URL}/parts`, { headers: getHeaders() });
    return handleResponse(response);
}

export const getAllUsers = async (): Promise<User[]> => {
    const response = await fetch(`${API_BASE_URL}/users`, { headers: getHeaders() });
    return handleResponse(response);
}


// --- DATA MUTATION ---
export const addMaintenanceRecord = async (record: Omit<MaintenanceRecord, 'id' | 'timestamp' | 'userId'>): Promise<MaintenanceRecord> => {
    const response = await fetch(`${API_BASE_URL}/maintenanceRecords`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(record)
    });
    return handleResponse(response);
};

// --- ADMIN FUNCTIONS ---
type EntityType = 'regions' | 'users' | 'points' | 'machines' | 'parts';

export const addEntity = async <T,>(entityType: EntityType, entityData: Omit<T, 'id'>): Promise<T> => {
    const response = await fetch(`${API_BASE_URL}/${entityType}`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(entityData)
    });
    return handleResponse(response);
}

export const updateEntity = async <T extends {id: string}>(entityType: EntityType, updatedEntityData: Partial<T> & { id: string }): Promise<T> => {
    const { id, ...payload } = updatedEntityData;
    const response = await fetch(`${API_BASE_URL}/${entityType}/${id}`, {
        method: 'PUT',
        headers: getHeaders(),
        body: JSON.stringify(payload)
    });
    return handleResponse(response);
}


export const deleteEntity = async (entityType: EntityType, id: string): Promise<{id: string}> => {
    const response = await fetch(`${API_BASE_URL}/${entityType}/${id}`, {
        method: 'DELETE',
        headers: getHeaders()
    });
    return handleResponse(response);
}
