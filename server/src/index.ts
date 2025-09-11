// FIX: Import specific types from express to resolve type errors with Request and Response objects.
// FIX: Removed `type` keyword from express import to ensure correct type resolution for Request, Response, and NextFunction.
import express, { Request as ExpressRequest, Response as ExpressResponse, NextFunction } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
// FIX: Correct Prisma imports by removing the `type` keyword for model types. This allows TypeScript to resolve them correctly and should fix cascading type errors.
// FIX: Changed import to use namespace and destructuring to fix module resolution errors.
import { PrismaClient, MachineStatus, User, Region } from '@prisma/client';


// FIX: Add declaration for process to fix "Property 'exit' does not exist on type 'Process'" error.
declare const process: any;

dotenv.config();

const app = express();
const prisma = new PrismaClient();
const PORT = process.env.PORT || 4000;
const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
    console.error("FATAL ERROR: JWT_SECRET is not defined.");
    process.exit(1);
}

app.use(cors());
app.use(express.json({ limit: '5mb' })); // Increase limit for CSV data

// Extend Express Request type
// FIX: Use imported Request type directly.
type AuthRequest = ExpressRequest & {
    user?: User & { region: Region | null };
};

// Auth middleware
// FIX: Use imported Response and NextFunction types.
const authMiddleware = async (req: AuthRequest, res: ExpressResponse, next: NextFunction) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ message: 'Authentication token required' });
    }
    const token = authHeader.split(' ')[1];
    try {
        const decoded = jwt.verify(token, JWT_SECRET) as { id: string };
        const user = await prisma.user.findUnique({ 
            where: { id: decoded.id }, 
            include: { region: true } 
        });
        if (!user) {
            return res.status(401).json({ message: 'User not found' });
        }
        req.user = user as User & { region: Region | null };
        next();
    } catch (error) {
        return res.status(403).json({ message: 'Invalid or expired token' });
    }
};


// --- ROUTES ---

// AUTH
// FIX: Use imported Request and Response types.
app.post('/api/auth/login', async (req: ExpressRequest, res: ExpressResponse) => {
    const { login, password } = req.body;
    if (!login || !password) {
        return res.status(400).json({ message: 'Login and password are required' });
    }
    const user = await prisma.user.findUnique({ where: { login }, include: { region: true } });
    if (!user || !await bcrypt.compare(password, user.password)) {
        return res.status(401).json({ message: 'Invalid credentials' });
    }
    const { password: _, ...userPayload } = user;
    const token = jwt.sign({ id: user.id }, JWT_SECRET, { expiresIn: '1d' });
    res.json({ token, user: userPayload });
});

// FIX: Use imported Response type.
app.get('/api/auth/me', authMiddleware, async (req: AuthRequest, res: ExpressResponse) => {
    const { password: _, ...userWithoutPassword } = req.user!;
    res.json(userWithoutPassword);
});

// GET ALL DATA
// FIX: Use imported Response type.
app.get('/api/data', authMiddleware, async (req: AuthRequest, res: ExpressResponse) => {
    const user = req.user!;
    
    const userSelect = { 
        id: true, name: true, login: true, role: true, 
        regionId: true,
        region: { select: { id: true, name: true } } 
    };

    if (user.role === 'ADMIN') {
        const [regions, users, points, machines, maintenanceRecords, parts] = await Promise.all([
            prisma.region.findMany(),
            prisma.user.findMany({ select: userSelect }),
            prisma.point.findMany(),
            prisma.machine.findMany(),
            prisma.maintenanceRecord.findMany({ include: { usedParts: true } }),
            prisma.part.findMany(),
        ]);
        return res.json({ regions, users, points, machines, maintenanceRecords, parts });
    }

    if (user.role === 'TECHNICIAN') {
        const regionId = user.regionId;
        if (!regionId) {
            const users = await prisma.user.findMany({select: userSelect});
            const parts = await prisma.part.findMany();
            return res.json({ regions: [], points: [], machines: [], users, maintenanceRecords: [], parts });
        }
        
        const [regions, points, machines, users] = await Promise.all([
            prisma.region.findMany({ where: { id: regionId } }),
            prisma.point.findMany({ where: { regionId: regionId } }),
            prisma.machine.findMany({ where: { regionId: regionId } }),
            prisma.user.findMany({select: userSelect}), // Still need all users for names
        ]);
        const machineIds = machines.map(m => m.id);
        const maintenanceRecords = await prisma.maintenanceRecord.findMany({ 
            where: { machineId: { in: machineIds } },
            include: { usedParts: true }
        });
        const parts = await prisma.part.findMany();
        return res.json({ regions, points, machines, users, maintenanceRecords, parts });
    }
    res.status(403).json({ message: "Forbidden" });
});


// GET MACHINE DETAILS
// FIX: Use imported Response type.
app.get('/api/machines/:id/details', authMiddleware, async (req: AuthRequest, res: ExpressResponse) => {
    const { id } = req.params;
    const machine = await prisma.machine.findUnique({ where: { id } });
    if (!machine) return res.status(404).json({ message: 'Machine not found' });

    const records = await prisma.maintenanceRecord.findMany({
        where: { machineId: id },
        orderBy: { timestamp: 'desc' },
        include: { usedParts: true }
    });
    res.json({ machine, records });
});

// SYNC REGION DATA
// FIX: Use imported Response type.
app.get('/api/regions/:id/sync', authMiddleware, async (req: AuthRequest, res: ExpressResponse) => {
    const { id: regionId } = req.params;
    const user = req.user!;

    if (user.role === 'TECHNICIAN' && user.regionId !== regionId) {
        return res.status(403).json({ message: "Forbidden: You do not have access to this region." });
    }
    
    try {
        const points = await prisma.point.findMany({ where: { regionId } });
        const machines = await prisma.machine.findMany({ where: { regionId } });
        const machineIds = machines.map(m => m.id);
        const maintenanceRecords = await prisma.maintenanceRecord.findMany({ 
            where: { machineId: { in: machineIds } },
            include: { usedParts: true }
        });
        res.json({ points, machines, maintenanceRecords });
    } catch (error) {
        console.error(`Error syncing region ${regionId}:`, error);
        res.status(500).json({ message: "Failed to fetch region data for sync." });
    }
});


// GET ALL (for specific lists)
// FIX: Use imported Response type.
app.get('/api/parts', authMiddleware, async (req: AuthRequest, res: ExpressResponse) => res.json(await prisma.part.findMany()));
app.get('/api/users', authMiddleware, async (req: AuthRequest, res: ExpressResponse) => res.json(await prisma.user.findMany({
    select: { 
        id: true, name: true, login: true, role: true, 
        region: { select: { id: true, name: true } },
        regionId: true
    }
})));


// ADD MAINTENANCE RECORD
// FIX: Use imported Response type.
app.post('/api/maintenanceRecords', authMiddleware, async (req: AuthRequest, res: ExpressResponse) => {
    const { machineId, description, usedParts, timestamp } = req.body;
    const newRecord = await prisma.maintenanceRecord.create({
        data: {
            machineId,
            description,
            userId: req.user!.id,
            timestamp: timestamp ? new Date(timestamp) : new Date(),
            usedParts: {
                create: usedParts.map((p: {partId: string, quantity: number}) => ({
                    partId: p.partId,
                    quantity: p.quantity
                }))
            }
        },
        include: { usedParts: true }
    });
    res.status(201).json(newRecord);
});

// --- ADMIN GENERIC CRUD ---
const entityTypes = ['regions', 'users', 'points', 'machines', 'parts'] as const;
type EntityType = typeof entityTypes[number];
const modelMapping: Record<EntityType, any> = {
    regions: prisma.region,
    users: prisma.user,
    points: prisma.point,
    machines: prisma.machine,
    parts: prisma.part,
};

// FIX: Use imported Response and NextFunction types.
const adminMiddleware = (req: AuthRequest, res: ExpressResponse, next: NextFunction) => {
    if (req.user?.role !== 'ADMIN') {
        return res.status(403).json({ message: 'Admin access required' });
    }
    next();
};

// --- IMPORT/EXPORT ROUTES ---
const toCsv = (headers: string[], data: any[]): string => {
    const csvRows = [];
    csvRows.push(headers.join(','));
    for (const row of data) {
        const values = headers.map(header => {
            const val = row[header] === null || row[header] === undefined ? '' : row[header];
            const escaped = ('' + val).replace(/"/g, '""');
            return `"${escaped}"`;
        });
        csvRows.push(values.join(','));
    }
    return csvRows.join('\n');
};

const parseCsv = (csvString: string): Record<string, string>[] => {
    // Remove UTF-8 BOM if present
    if (csvString.startsWith('\uFEFF')) {
        csvString = csvString.substring(1);
    }
    
    const lines = csvString.replace(/\r/g, "").trim().split('\n');
    if (lines.length < 2) return [];

    const headers = lines[0].split(',').map(h => h.trim());
    const dataLines = lines.slice(1);
    
    // This regex handles quoted fields, including commas and escaped quotes ("") inside.
    const csvRegex = /(?:"((?:[^"]|"")*)"|([^,]*))(,|$)/g;

    return dataLines.map(line => {
        if (!line.trim()) return null;

        const values: string[] = [];
        let match;
        csvRegex.lastIndex = 0; // Reset regex state for each line

        while (match = csvRegex.exec(line)) {
            // match[1] is the content of a quoted field, match[2] is an unquoted field
            const value = match[1] !== undefined 
                ? match[1].replace(/""/g, '"') // Unescape double quotes
                : (match[2] || '');
            values.push(value.trim());
            
            if (match[3] === '') break; // End of the line
        }

        if (values.length >= headers.length) {
            return headers.reduce((obj, header, index) => {
                obj[header] = values[index] || '';
                return obj;
            }, {} as Record<string, string>);
        }
        return null;
    }).filter(record => record !== null) as Record<string, string>[];
};


// FIX: Use imported Response type.
app.get('/api/:entityType/export', authMiddleware, adminMiddleware, async (req: AuthRequest, res: ExpressResponse) => {
    const { entityType } = req.params;
    if (!['parts', 'points', 'machines'].includes(entityType)) {
        return res.status(400).json({ message: 'Export not supported for this entity type' });
    }
    
    // Add UTF-8 BOM for Excel compatibility with Cyrillic characters
    const BOM = '\uFEFF';

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename=${entityType}_export_${new Date().toISOString().split('T')[0]}.csv`);

    try {
        if (entityType === 'parts') {
            const parts = await prisma.part.findMany();
            res.status(200).send(BOM + toCsv(['sku', 'name'], parts));
        } else if (entityType === 'points') {
            const points = await prisma.point.findMany({ include: { region: true } });
            const data = points.map(p => ({ name: p.name, address: p.address, region_name: p.region.name }));
            res.status(200).send(BOM + toCsv(['name', 'address', 'region_name'], data));
        } else if (entityType === 'machines') {
            const machines = await prisma.machine.findMany({ include: { region: true, point: true } });
            const data = machines.map(m => ({
                serialNumber: m.serialNumber, name: m.name, status: m.status,
                region_name: m.region.name, point_name: m.point?.name || ''
            }));
            res.status(200).send(BOM + toCsv(['serialNumber', 'name', 'status', 'region_name', 'point_name'], data));
        }
    } catch (error) {
        console.error(`Export failed for ${entityType}:`, error);
        res.status(500).send('Error generating export file.');
    }
});


// FIX: Use imported Request and Response types.
app.post('/api/:entityType/import', authMiddleware, adminMiddleware, async (req: ExpressRequest, res: ExpressResponse) => {
    const { entityType } = req.params;
    const { csvData } = req.body;

    if (!csvData) return res.status(400).json({ message: 'CSV data is required.' });
    if (!['parts', 'points', 'machines'].includes(entityType)) {
        return res.status(400).json({ message: 'Import not supported for this entity type' });
    }

    let created = 0, updated = 0;
    const errors: string[] = [];
    const records = parseCsv(csvData);

    try {
        if (entityType === 'parts') {
            for (const [i, r] of records.entries()) {
                if (!r.sku || !r.name) { errors.push(`Строка ${i + 2}: Отсутствуют sku или name.`); continue; }
                const existing = await prisma.part.findUnique({ where: { sku: r.sku } });
                if (existing) { await prisma.part.update({ where: { sku: r.sku }, data: { name: r.name }}); updated++; } 
                else { await prisma.part.create({ data: { sku: r.sku, name: r.name }}); created++; }
            }
        } else if (entityType === 'points') {
            const regionMap = new Map((await prisma.region.findMany()).map(reg => [reg.name.toLowerCase(), reg.id]));
            for (const [i, r] of records.entries()) {
                if (!r.name || !r.address || !r.region_name) { errors.push(`Строка ${i + 2}: Отсутствуют name, address, или region_name.`); continue; }
                const regionId = regionMap.get(r.region_name.toLowerCase());
                if (!regionId) { errors.push(`Строка ${i + 2}: Регион '${r.region_name}' не найден.`); continue; }
                const existing = await prisma.point.findFirst({ where: { name: r.name, regionId } });
                if (existing) { await prisma.point.update({ where: { id: existing.id }, data: { address: r.address } }); updated++; } 
                else { await prisma.point.create({ data: { name: r.name, address: r.address, regionId } }); created++; }
            }
        } else if (entityType === 'machines') {
            const regionMap = new Map((await prisma.region.findMany()).map(reg => [reg.name.toLowerCase(), reg.id]));
            const pointMap = new Map((await prisma.point.findMany()).map(p => [`${p.name.toLowerCase()}|${p.regionId}`, p.id]));
            for (const [i, r] of records.entries()) {
                if (!r.serialNumber || !r.name || !r.status || !r.region_name) { errors.push(`Строка ${i + 2}: Отсутствуют обязательные поля.`); continue; }
                if (!Object.values(MachineStatus).includes(r.status as MachineStatus)) { errors.push(`Строка ${i + 2}: Неверный статус '${r.status}'.`); continue; }
                const regionId = regionMap.get(r.region_name.toLowerCase());
                if (!regionId) { errors.push(`Строка ${i + 2}: Регион '${r.region_name}' не найден.`); continue; }
                let pointId = null;
                if (r.point_name) {
                    pointId = pointMap.get(`${r.point_name.toLowerCase()}|${regionId}`);
                    if (!pointId) { errors.push(`Строка ${i + 2}: Точка '${r.point_name}' не найдена в регионе '${r.region_name}'.`); continue; }
                }
                const data = { name: r.name, status: r.status as MachineStatus, regionId, pointId, serialNumber: r.serialNumber };
                const existing = await prisma.machine.findUnique({ where: { serialNumber: r.serialNumber } });
                if (existing) { await prisma.machine.update({ where: { serialNumber: r.serialNumber }, data }); updated++; } 
                else { await prisma.machine.create({ data }); created++; }
            }
        }
        res.status(200).json({ created, updated, errors });
    } catch (error: any) {
        console.error(`Import failed for ${entityType}:`, error);
        res.status(500).json({ message: 'Internal server error', created, updated, errors: [...errors, error.message] });
    }
});


// FIX: Use imported Response type.
app.post('/api/:entityType', authMiddleware, adminMiddleware, async (req: AuthRequest, res: ExpressResponse) => {
    const { entityType } = req.params;
    if (!entityTypes.includes(entityType as EntityType)) {
        return res.status(400).json({ message: 'Invalid entity type' });
    }
    const model = modelMapping[entityType as EntityType];
    
    let data = req.body;

    if (entityType === 'users') {
        if (data.password) {
            data.password = await bcrypt.hash(data.password, 10);
        }
    }
    
    const newEntity = await model.create({ data });
    res.status(201).json(newEntity);
});

// FIX: Use imported Response type.
app.put('/api/:entityType/:id', authMiddleware, adminMiddleware, async (req: AuthRequest, res: ExpressResponse) => {
    const { entityType, id } = req.params;
    if (!entityTypes.includes(entityType as EntityType)) {
        return res.status(400).json({ message: 'Invalid entity type' });
    }
    const model = modelMapping[entityType as EntityType];
    
    let data = req.body;

    if (entityType === 'users') {
        if (data.password) {
            data.password = await bcrypt.hash(data.password, 10);
        } else {
            delete data.password;
        }
    }

    try {
        const updatedEntity = await model.update({ 
            where: { id }, 
            data,
            include: entityType === 'users' ? { region: true } : undefined
        });
        if (entityType === 'users') {
            delete (updatedEntity as any).password;
        }
        res.json(updatedEntity);
    } catch (error) {
        console.error(error);
        res.status(404).json({ message: 'Entity not found' });
    }
});

// FIX: Use imported Response type.
app.delete('/api/:entityType/:id', authMiddleware, adminMiddleware, async (req: AuthRequest, res: ExpressResponse) => {
    const { entityType, id } = req.params;
    if (!entityTypes.includes(entityType as EntityType)) {
        return res.status(400).json({ message: 'Invalid entity type' });
    }
    const model = modelMapping[entityType as EntityType];
    try {
        await model.delete({ where: { id } });
        res.json({ id });
    } catch (error) {
         res.status(404).json({ message: 'Entity not found' });
    }
});


app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
