// FIX: The import of 'process' was removed to rely on the global 'process' object provided by Node.js, which resolves the type error for 'process.exit'.
// import process from 'process';
// FIX: Changed to a named import for PrismaClient and Role to resolve type errors.
import { PrismaClient, Role } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import * as dbData from '../../db.json';

// FIX: Instantiated PrismaClient from the named import.
const prisma = new PrismaClient();

async function main() {
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
    await prisma.user.upsert({
      where: { id: user.id },
      update: {},
      create: {
        id: user.id,
        name: user.name,
        login: user.login,
        password: hashedPassword,
        // FIX: Used the imported Role type for casting.
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
