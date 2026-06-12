import { prisma } from '../config/database';
import { AppError } from '../middleware/error.middleware';
import type { CreateEmergencyContactInput, UpdateEmergencyContactInput } from '../validators/emergency-contact.validator';

const MAX_CONTACTS = 5;

function normalizePayload(input: CreateEmergencyContactInput | UpdateEmergencyContactInput) {
  return {
    name: input.name.trim(),
    relationship: input.relationship.trim(),
    phone: input.phone.trim(),
    email: input.email?.trim() || null,
    isPrimary: input.isPrimary ?? false,
  };
}

function formatContact(contact: {
  id: string;
  name: string;
  relationship: string;
  phone: string;
  email: string | null;
  isPrimary: boolean;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    id: contact.id,
    name: contact.name,
    relationship: contact.relationship,
    phone: contact.phone,
    email: contact.email,
    isPrimary: contact.isPrimary,
    createdAt: contact.createdAt,
    updatedAt: contact.updatedAt,
  };
}

export async function listEmergencyContacts(userId: string) {
  const contacts = await prisma.emergencyContact.findMany({
    where: { userId },
    orderBy: [
      { isPrimary: 'desc' },
      { createdAt: 'asc' },
    ],
    select: {
      id: true,
      name: true,
      relationship: true,
      phone: true,
      email: true,
      isPrimary: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  return {
    contacts: contacts.map(formatContact),
    count: contacts.length,
    maxContacts: MAX_CONTACTS,
  };
}

export async function createEmergencyContact(userId: string, input: CreateEmergencyContactInput) {
  const payload = normalizePayload(input);

  return prisma.$transaction(async (tx) => {
    const currentCount = await tx.emergencyContact.count({ where: { userId } });
    if (currentCount >= MAX_CONTACTS) {
      throw new AppError('Maximum of 5 emergency contacts allowed.', 400);
    }

    if (payload.isPrimary) {
      await tx.emergencyContact.updateMany({
        where: { userId, isPrimary: true },
        data: { isPrimary: false },
      });
    }

    const created = await tx.emergencyContact.create({
      data: {
        userId,
        name: payload.name,
        relationship: payload.relationship,
        phone: payload.phone,
        email: payload.email,
        isPrimary: payload.isPrimary,
      },
      select: {
        id: true,
        name: true,
        relationship: true,
        phone: true,
        email: true,
        isPrimary: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return formatContact(created);
  });
}

async function ensureOwnership(userId: string, contactId: string) {
  const contact = await prisma.emergencyContact.findFirst({
    where: { id: contactId, userId },
    select: { id: true },
  });

  if (!contact) throw new AppError('Emergency contact not found.', 404);
}

export async function updateEmergencyContact(userId: string, contactId: string, input: UpdateEmergencyContactInput) {
  const payload = normalizePayload(input);

  return prisma.$transaction(async (tx) => {
    const existing = await tx.emergencyContact.findFirst({
      where: { id: contactId, userId },
      select: { id: true },
    });

    if (!existing) throw new AppError('Emergency contact not found.', 404);

    if (payload.isPrimary) {
      await tx.emergencyContact.updateMany({
        where: { userId, isPrimary: true, id: { not: contactId } },
        data: { isPrimary: false },
      });
    }

    const updated = await tx.emergencyContact.update({
      where: { id: contactId },
      data: payload,
      select: {
        id: true,
        name: true,
        relationship: true,
        phone: true,
        email: true,
        isPrimary: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return formatContact(updated);
  });
}

export async function deleteEmergencyContact(userId: string, contactId: string) {
  await ensureOwnership(userId, contactId);
  await prisma.emergencyContact.delete({ where: { id: contactId } });
}

export async function setPrimaryEmergencyContact(userId: string, contactId: string) {
  return prisma.$transaction(async (tx) => {
    const existing = await tx.emergencyContact.findFirst({
      where: { id: contactId, userId },
      select: { id: true },
    });

    if (!existing) throw new AppError('Emergency contact not found.', 404);

    await tx.emergencyContact.updateMany({
      where: { userId, isPrimary: true },
      data: { isPrimary: false },
    });

    const updated = await tx.emergencyContact.update({
      where: { id: contactId },
      data: { isPrimary: true },
      select: {
        id: true,
        name: true,
        relationship: true,
        phone: true,
        email: true,
        isPrimary: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return formatContact(updated);
  });
}
