
// FIX: Import 'process' to provide correct TypeScript types for the global process object.
import 'process';
import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { PrismaClient, User } from '@prisma/client';

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
app.use(express.json());

// Extend Express Request type
// FIX: Explicitly extend express.Request to avoid conflicts with other global Request types.
interface AuthRequest extends express.Request {
    user?: User;
}

// Auth middleware
const authMiddleware = (req: AuthRequest, res: Response, next: NextFunction) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ message: 'Authentication token required' });
    }
    const token = authHeader.split(' ')[1];
    try {
        const decoded = jwt.verify(token, JWT_SECRET) as User;
        req.user = decoded;
        next();
    } catch (error) {
        return res.status(403).json({ message: 'Invalid or expired token' });
    }
};


// --- ROUTES ---

// AUTH
app.post('/api/auth/login', async (req, res) => {
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

app.get('/api/auth/me', authMiddleware, async (req: AuthRequest, res) => {
    const user = await prisma.user.findUnique({where: {id: req.user!.id}});
    if (!user) return res.status(404).json({ message: 'User not found' });
    const { password, ...userWithoutPassword } = user;
    res.json(userWithoutPassword);
});

// GET ALL DATA
app.get('/api/data', authMiddleware, async (req: AuthRequest, res) => {
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
app.get('/api/machines/:id/details', authMiddleware, async (req, res) => {
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


// GET ALL (for specific lists)
app.get('/api/parts', authMiddleware, async (req, res) => res.json(await prisma.part.findMany()));
app.get('/api/users', authMiddleware, async (req, res) => res.json(await prisma.user.findMany({select: {id: true, name: true, login: true, role: true, regionId: true}})));


// ADD MAINTENANCE RECORD
app.post('/api/maintenanceRecords', authMiddleware, async (req: AuthRequest, res) => {
    const { machineId, description, usedParts } = req.body;
    const newRecord = await prisma.maintenanceRecord.create({
        data: {
            machineId,
            description,
            userId: req.user!.id,
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

const adminMiddleware = (req: AuthRequest, res: Response, next: NextFunction) => {
    if (req.user?.role !== 'ADMIN') {
        return res.status(403).json({ message: 'Admin access required' });
    }
    next();
};

app.post('/api/:entityType', authMiddleware, adminMiddleware, async (req, res) => {
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

app.put('/api/:entityType/:id', authMiddleware, adminMiddleware, async (req, res) => {
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

app.delete('/api/:entityType/:id', authMiddleware, adminMiddleware, async (req, res) => {
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
