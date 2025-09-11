// server/prisma/seed.ts

// FIX: Consolidate Prisma imports into a single statement to fix potential module resolution errors.
import { PrismaClient, Role, type Prisma } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import * as fs from 'fs';
import * as path from 'path';

// FIX: Add declaration for __dirname to fix "Cannot find name '__dirname'" error.
declare const __dirname: string;
// FIX: Add declaration for process to fix "Property 'exit' does not exist on type 'Process'" error.
declare const process: any;

const prisma = new PrismaClient();

// Определяем интерфейс для данных, чтобы TypeScript "понимал" структуру db.json
interface DbData {
  regions: Prisma.RegionCreateInput[];
  // ИСПРАВЛЕНИЕ: Переименовано 'password_plain' в 'password' для соответствия структуре db.json
  users: (Omit<Prisma.UserCreateInput, 'role' | 'region'> & { password: string; role: string; regionId?: string | null })[];
  points: Prisma.PointCreateInput[];
  machines: Prisma.MachineCreateInput[];
  parts: Prisma.PartCreateInput[];
  maintenanceRecords: (Omit<Prisma.MaintenanceRecordCreateInput, 'timestamp'> & { timestamp: string; usedParts: { partId: string; quantity: number }[] })[];
}

async function main() {
  console.log('Reading data from db.json...');
  
  const dbPath = path.join(__dirname, '../../prisma/db.json');
  const dbFile = fs.readFileSync(dbPath, 'utf-8');
  const dbData = JSON.parse(dbFile) as DbData;

  console.log('Start seeding...');

  // Seed Regions
  console.log('Seeding regions...');
  for (const region of dbData.regions) {
    await prisma.region.upsert({
      where: { id: region.id },
      update: {},
      create: region,
    });
  }

  // Seed Users with hashed passwords
  console.log('Seeding users...');
  for (const user of dbData.users) {
    const hashedPassword = await bcrypt.hash(user.password, 10);
    const { password, regionId, ...userData } = user;
    await prisma.user.upsert({
      where: { id: user.id },
      update: {},
      create: {
        ...userData,
        password: hashedPassword,
        role: user.role as Role,
        regionId: user.regionId,
      },
    });
  }

  // Seed Points
  console.log('Seeding points...');
  for (const point of dbData.points) {
    await prisma.point.upsert({
      where: { id: point.id },
      update: {},
      create: point,
    });
  }

  // Seed Machines
  console.log('Seeding machines...');
  for (const machine of dbData.machines) {
    await prisma.machine.upsert({
      where: { id: machine.id },
      update: {},
      create: machine,
    });
  }
  
  // Seed Parts
  console.log('Seeding parts...');
  for (const part of dbData.parts) {
      await prisma.part.upsert({
        where: { id: part.id },
        update: {},
        create: part,
      });
  }
  
  // Seed Maintenance Records and Used Parts
  console.log('Seeding maintenance records...');
  for (const record of dbData.maintenanceRecords) {
    const { usedParts, ...recordData } = record;
    const createdRecord = await prisma.maintenanceRecord.upsert({
      where: { id: record.id },
      update: {},
      create: {
        ...recordData,
        timestamp: new Date(recordData.timestamp),
      },
    });

    if (usedParts && usedParts.length > 0) {
      for (const usedPart of usedParts) {
        await prisma.usedPart.create({
          data: {
            maintenanceRecordId: createdRecord.id,
            partId: usedPart.partId,
            quantity: usedPart.quantity,
          },
        });
      }
    }
  }

  console.log('Seeding finished.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });