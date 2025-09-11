// FIX: Import Request, Response, NextFunction directly from express to avoid type conflicts.
// Switched to a default import for express and using express.Request etc. to resolve type conflicts.
// FIX: Import Request, Response, NextFunction as named imports from express.
import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
// FIX: Using direct imports for PrismaClient and User to ensure correct type resolution.
// Switched to namespace import for Prisma to resolve type errors.
// FIX: Change namespace import to named imports for PrismaClient and types.
import { PrismaClient, User } from '@prisma/client';
// FIX: Import process to provide types for process.exit.
// Removed import to rely on the global Node.js process type.

// FIX: Add declaration for process to fix "Property 'exit' does not exist on type 'Process'" error.
declare const process: any;

dotenv.config();

const app = express();
// FIX: Instantiated PrismaClient from the direct import.
// FIX: Instantiate PrismaClient directly from the import.
const prisma = new PrismaClient();
const PORT = process.env.PORT || 4000;
const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
    console.error("FATAL ERROR: JWT_SECRET is not defined.");
    process.exit(1);
}

app.use(cors());
app.use(express.json());

// Extend Express Request type
// FIX: Extended the directly imported Request type and used the imported User type.
// Switched to using namespaced types to avoid conflicts.
// FIX: Changed to a type alias with an intersection to resolve issues with missing properties on AuthRequest.
// FIX: Use named import 'Request' and 'User' for correct type extension.
type AuthRequest = Request & {
    user?: User;
};

// Auth middleware
// FIX: Typed request and response with the directly imported types.
// Switched to using namespaced types to avoid conflicts.
// FIX: Use named imports for Express types (Response, NextFunction).
const authMiddleware = (req: AuthRequest, res: Response, next: NextFunction) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ message: 'Authentication token required' });
    }
    const token = authHeader.split(' ')[1];
    try {
        // FIX: Used the directly imported User type for casting.
        // Switched to using namespaced types to avoid conflicts.
        // FIX: Use imported User type.
        const decoded = jwt.verify(token, JWT_SECRET) as User;
        req.user = decoded;
        next();
    } catch (error) {
        return res.status(403).json({ message: 'Invalid or expired token' });
    }
};


// --- ROUTES ---

// AUTH
// FIX: Typed request and response with the directly imported types.
// Switched to using namespaced types to avoid conflicts.
// FIX: Use named imports for Express types (Request, Response).
app.post('/api/auth/login', async (req: Request, res: Response) => {
    const { login, password } = req.body;
    if (!login || !password) {
        return res.status(400).json({ message: 'Login and password are required' });
    }
    const user = await prisma.user.findUnique({ where: { login } });
    if (!user || !await bcrypt.compare(password, user.password)) {
        return res.status(401).json({ message: 'Invalid credentials' });
    }
    const userPayload = { id: user.id, name: user.name, login: user.login, role: user.role, regionId: user.regionId };
    const token = jwt.sign(userPayload, JWT_SECRET, { expiresIn: '1d' });
    res.json({ token, user: userPayload });
});

// FIX: Typed request and response with the directly imported types.
// Switched to using namespaced types to avoid conflicts.
// FIX: Use named imports for Express types (Response) and AuthRequest.
app.get('/api/auth/me', authMiddleware, async (req: AuthRequest, res: Response) => {
    const user = await prisma.user.findUnique({where: {id: req.user!.id}});
    if (!user) return res.status(404).json({ message: 'User not found' });
    const { password, ...userWithoutPassword } = user;
    res.json(userWithoutPassword);
});

// GET ALL DATA
// FIX: Typed request and response with the directly imported types.
// Switched to using namespaced types to avoid conflicts.
// FIX: Use named imports for Express types (Response) and AuthRequest.
app.get('/api/data', authMiddleware, async (req: AuthRequest, res: Response) => {
    const user = req.user!;
    if (user.role === 'ADMIN') {
        const [regions, users, points, machines, maintenanceRecords, parts] = await Promise.all([
            prisma.region.findMany(),
            prisma.user.findMany({select: {id: true, name: true, login: true, role: true, regionId: true}}),
            prisma.point.findMany(),
            prisma.machine.findMany(),
            prisma.maintenanceRecord.findMany({ include: { usedParts: true } }),
            prisma.part.findMany(),
        ]);
        return res.json({ regions, users, points, machines, maintenanceRecords, parts });
    }

    if (user.role === 'TECHNICIAN' && user.regionId) {
        const regionId = user.regionId;
        const [regions, points, machines, users] = await Promise.all([
            prisma.region.findMany({ where: { id: regionId } }),
            prisma.point.findMany({ where: { regionId } }),
            prisma.machine.findMany({ where: { regionId } }),
            prisma.user.findMany({select: {id: true, name: true, login: true, role: true, regionId: true}}), // Still need all users for names
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
// FIX: Typed request and response with the directly imported types.
// Switched to using namespaced types to avoid conflicts.
// FIX: Use named imports for Express types (Response) and AuthRequest.
app.get('/api/machines/:id/details', authMiddleware, async (req: AuthRequest, res: Response) => {
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
// FIX: Use named imports for Express types (Response) and AuthRequest.
app.get('/api/regions/:id/sync', authMiddleware, async (req: AuthRequest, res: Response) => {
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
// FIX: Typed request and response with the directly imported types.
// Switched to using namespaced types to avoid conflicts.
// FIX: Use named imports for Express types (Response) and AuthRequest.
app.get('/api/parts', authMiddleware, async (req: AuthRequest, res: Response) => res.json(await prisma.part.findMany()));
// FIX: Typed request and response with the directly imported types.
// Switched to using namespaced types to avoid conflicts.
// FIX: Use named imports for Express types (Response) and AuthRequest.
app.get('/api/users', authMiddleware, async (req: AuthRequest, res: Response) => res.json(await prisma.user.findMany({select: {id: true, name: true, login: true, role: true, regionId: true}})));


// ADD MAINTENANCE RECORD
// FIX: Typed request and response with the directly imported types.
// Switched to using namespaced types to avoid conflicts.
// FIX: Use named imports for Express types (Response) and AuthRequest.
app.post('/api/maintenanceRecords', authMiddleware, async (req: AuthRequest, res: Response) => {
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

// FIX: Typed request and response with the directly imported types.
// Switched to using namespaced types to avoid conflicts.
// FIX: Use named imports for Express types (Response, NextFunction) and AuthRequest.
const adminMiddleware = (req: AuthRequest, res: Response, next: NextFunction) => {
    if (req.user?.role !== 'ADMIN') {
        return res.status(403).json({ message: 'Admin access required' });
    }
    next();
};

// FIX: Typed request and response with the directly imported types.
// Switched to using namespaced types to avoid conflicts.
// FIX: Use named imports for Express types (Response) and AuthRequest.
app.post('/api/:entityType', authMiddleware, adminMiddleware, async (req: AuthRequest, res: Response) => {
    const { entityType } = req.params;
    if (!entityTypes.includes(entityType as EntityType)) {
        return res.status(400).json({ message: 'Invalid entity type' });
    }
    const model = modelMapping[entityType as EntityType];
    
    // Hash password for new user
    if (entityType === 'users' && req.body.password) {
        req.body.password = await bcrypt.hash(req.body.password, 10);
    }
    
    const newEntity = await model.create({ data: req.body });
    res.status(201).json(newEntity);
});

// FIX: Typed request and response with the directly imported types.
// Switched to using namespaced types to avoid conflicts.
// FIX: Use named imports for Express types (Response) and AuthRequest.
app.put('/api/:entityType/:id', authMiddleware, adminMiddleware, async (req: AuthRequest, res: Response) => {
    const { entityType, id } = req.params;
    if (!entityTypes.includes(entityType as EntityType)) {
        return res.status(400).json({ message: 'Invalid entity type' });
    }
    const model = modelMapping[entityType as EntityType];
    
    // Hash password if it's being updated
    if (entityType === 'users' && req.body.password) {
        req.body.password = await bcrypt.hash(req.body.password, 10);
    } else if (entityType === 'users') {
        // Prevent password from being overwritten with undefined
        delete req.body.password;
    }

    try {
        const updatedEntity = await model.update({ where: { id }, data: req.body });
        // Don't send back password hash
        if (entityType === 'users') {
            delete (updatedEntity as any).password;
        }
        res.json(updatedEntity);
    } catch (error) {
        res.status(404).json({ message: 'Entity not found' });
    }
});

// FIX: Typed request and response with the directly imported types.
// Switched to using namespaced types to avoid conflicts.
// FIX: Use named imports for Express types (Response) and AuthRequest.
app.delete('/api/:entityType/:id', authMiddleware, adminMiddleware, async (req: AuthRequest, res: Response) => {
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