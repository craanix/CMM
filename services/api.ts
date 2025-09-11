import type { Region, Point, Machine, User, MaintenanceRecord, Part, AllData, ImportSummary } from '../types';
import { getCachedData, setCachedData, queueRequest } from './db';

const API_BASE_URL = '/api'; // Using a relative URL for proxying

const getAuthToken = (): string | null => {
    return localStorage.getItem('cmm_token');
}

const getHeaders = (): Record<string, string> => {
    const token = getAuthToken();
    const headers: Record<string, string> = {
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

const triggerSync = () => {
    if ('serviceWorker' in navigator && 'SyncManager' in window) {
        navigator.serviceWorker.ready.then(reg => {
            // FIX: Cast ServiceWorkerRegistration to 'any' to access the 'sync' property,
            // which is part of the Background Sync API and may not be in the default TS types.
            const regWithSync = reg as any;
            if(regWithSync.sync) {
                regWithSync.sync.register('sync-mutations').catch((err: any) => console.error("Sync registration failed:", err));
            }
        });
    }
}


// --- API Call Wrappers for Caching & Offline ---

const createCachedApiCall = <T,>(apiKey: string, fetcher: () => Promise<T>) => {
    return async (): Promise<T> => {
        try {
            const data = await fetcher();
            await setCachedData(apiKey, data);
            return data;
        } catch (error) {
            if (!navigator.onLine) {
                console.warn(`API fetch for ${apiKey} failed (offline), trying cache.`, error);
                const cachedData = await getCachedData<T>(apiKey);
                if (cachedData) return cachedData;
            }
            throw error;
        }
    };
};

const createCachedApiCallWithArg = <T, A extends string>(apiKeyFn: (arg: A) => string, fetcher: (arg: A) => Promise<T>) => {
    return async (arg: A): Promise<T> => {
        const apiKey = apiKeyFn(arg);
        try {
            const data = await fetcher(arg);
            await setCachedData(apiKey, data);
            return data;
        } catch (error) {
             if (!navigator.onLine) {
                console.warn(`API fetch for ${apiKey} failed (offline), trying cache.`, error);
                const cachedData = await getCachedData<T>(apiKey);
                if (cachedData) return cachedData;
            }
            throw error;
        }
    };
};

const handleMutation = async (url: string, method: 'POST' | 'PUT' | 'DELETE', body: any) => {
    if (!navigator.onLine) {
        console.log('Offline: Queuing mutation request.');
        await queueRequest({ url, method, body, headers: getHeaders() });
        triggerSync();
        // For optimistic updates, you can return a temporary object.
        // For simplicity, we'll return a success-like object.
        return { ...body, id: body.id || `offline_${Date.now()}` };
    }

    const response = await fetch(url, {
        method,
        headers: getHeaders(),
        body: JSON.stringify(body),
    });
    return handleResponse(response);
};


// --- AUTH (Network only) ---
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


// --- DATA FETCHING (Cached) ---
export const getAllDataForUser = createCachedApiCall('allData', async () => {
    const response = await fetch(`${API_BASE_URL}/data`, { headers: getHeaders() });
    return handleResponse(response);
});

export const getMachineDetails = createCachedApiCallWithArg(
    (machineId: string) => `machineDetails_${machineId}`,
    async (machineId: string) => {
        const response = await fetch(`${API_BASE_URL}/machines/${machineId}/details`, { headers: getHeaders() });
        return handleResponse(response);
    }
);

export const getAllParts = createCachedApiCall('allParts', async () => {
    const response = await fetch(`${API_BASE_URL}/parts`, { headers: getHeaders() });
    return handleResponse(response);
});

export const getAllUsers = createCachedApiCall('allUsers', async () => {
    const response = await fetch(`${API_BASE_URL}/users`, { headers: getHeaders() });
    return handleResponse(response);
});

export const syncRegionData = async (regionId: string): Promise<AllData> => {
    // 1. Fetch fresh list data for the specific region
    const response = await fetch(`${API_BASE_URL}/regions/${regionId}/sync`, { headers: getHeaders() });
    const newRegionData: { points: Point[], machines: Machine[], maintenanceRecords: MaintenanceRecord[] } = await handleResponse(response);

    // 2. Pre-cache details for each machine in the region to make them available offline
    console.log(`[Sync] Caching details for ${newRegionData.machines.length} machines in region ${regionId}`);
    const machineDetailPromises = newRegionData.machines.map(machine => 
        getMachineDetails(machine.id).catch(err => {
            // Log error but don't let a single failed fetch stop the whole sync
            console.error(`[Sync] Failed to cache details for machine ${machine.id}:`, err);
            return null; 
        })
    );
    await Promise.all(machineDetailPromises);
    console.log('[Sync] Machine detail caching complete.');

    // 3. Get the current full dataset from cache
    const allData = await getCachedData<AllData>('allData');

    if (!allData) {
        // If there's no cached data, we can't merge. Fallback to fetching everything.
        return getAllDataForUser();
    }
    
    // 4. Identify all machine IDs in the region from the *old* data to correctly replace records
    const oldMachineIdsInRegion = new Set(allData.machines.filter(m => m.regionId === regionId).map(m => m.id));

    // 5. Filter out the old data for the region being synced
    const otherPoints = allData.points.filter(p => p.regionId !== regionId);
    const otherMachines = allData.machines.filter(m => m.regionId !== regionId);
    const otherRecords = allData.maintenanceRecords.filter(r => !oldMachineIdsInRegion.has(r.machineId));

    // 6. Create the new, merged dataset
    const updatedData: AllData = {
        ...allData,
        points: [...otherPoints, ...newRegionData.points],
        machines: [...otherMachines, ...newRegionData.machines],
        maintenanceRecords: [...otherRecords, ...newRegionData.maintenanceRecords],
    };

    // 7. Update the cache with the merged data
    await setCachedData('allData', updatedData);

    // 8. Return the merged data
    return updatedData;
};


// --- DATA MUTATION (Offline-ready) ---
export const addMaintenanceRecord = async (record: Omit<MaintenanceRecord, 'id'>): Promise<MaintenanceRecord> => {
    const url = `${API_BASE_URL}/maintenanceRecords`;
    return handleMutation(url, 'POST', record);
};

// --- ADMIN FUNCTIONS (Offline-ready) ---
type EntityType = 'regions' | 'users' | 'points' | 'machines' | 'parts';

export const addEntity = async <T,>(entityType: EntityType, entityData: Omit<T, 'id'>): Promise<T> => {
    const url = `${API_BASE_URL}/${entityType}`;
    return handleMutation(url, 'POST', entityData);
}

export const updateEntity = async <T extends {id: string}>(entityType: EntityType, updatedEntityData: Partial<T> & { id: string }): Promise<T> => {
    const { id, ...payload } = updatedEntityData;
    const url = `${API_BASE_URL}/${entityType}/${id}`;
    return handleMutation(url, 'PUT', payload);
}

export const deleteEntity = async (entityType: EntityType, id: string): Promise<{id: string}> => {
    const url = `${API_BASE_URL}/${entityType}/${id}`;
    return handleMutation(url, 'DELETE', {});
}

// --- IMPORT/EXPORT FUNCTIONS ---
export const exportEntities = async (entityType: EntityType): Promise<void> => {
    const url = `${API_BASE_URL}/${entityType}/export`;
    try {
        const response = await fetch(url, {
            method: 'GET',
            headers: getHeaders(),
        });
        if (!response.ok) {
            throw new Error('Export failed');
        }
        const blob = await response.blob();
        const downloadUrl = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = downloadUrl;
        
        const disposition = response.headers.get('content-disposition');
        let filename = `${entityType}_export.csv`;
        if (disposition && disposition.includes('attachment')) {
            const filenameRegex = /filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/;
            const matches = filenameRegex.exec(disposition);
            if (matches != null && matches[1]) {
                filename = matches[1].replace(/['"]/g, '');
            }
        }
        
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.URL.revokeObjectURL(downloadUrl);
    } catch (error) {
        console.error('Error exporting data:', error);
        alert('Не удалось экспортировать данные.');
    }
};

export const importEntities = async (entityType: EntityType, csvData: string): Promise<ImportSummary> => {
    const url = `${API_BASE_URL}/${entityType}/import`;
    const response = await fetch(url, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ csvData }),
    });
    return handleResponse(response);
};