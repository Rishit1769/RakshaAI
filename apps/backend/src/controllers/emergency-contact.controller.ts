import { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { sendCreated, sendSuccess } from '../utils/response';
import * as EmergencyContactService from '../services/emergency-contact.service';

export const listEmergencyContacts = asyncHandler(async (req: Request, res: Response) => {
  const result = await EmergencyContactService.listEmergencyContacts(req.user!.id);
  sendSuccess(res, result, 'Emergency contacts retrieved');
});

export const createEmergencyContact = asyncHandler(async (req: Request, res: Response) => {
  const contact = await EmergencyContactService.createEmergencyContact(req.user!.id, req.body);
  sendCreated(res, contact, 'Emergency contact added');
});

export const updateEmergencyContact = asyncHandler(async (req: Request, res: Response) => {
  const contact = await EmergencyContactService.updateEmergencyContact(req.user!.id, req.params.id, req.body);
  sendSuccess(res, contact, 'Emergency contact updated');
});

export const deleteEmergencyContact = asyncHandler(async (req: Request, res: Response) => {
  await EmergencyContactService.deleteEmergencyContact(req.user!.id, req.params.id);
  sendSuccess(res, null, 'Emergency contact deleted');
});

export const setPrimaryEmergencyContact = asyncHandler(async (req: Request, res: Response) => {
  const contact = await EmergencyContactService.setPrimaryEmergencyContact(req.user!.id, req.params.id);
  sendSuccess(res, contact, 'Primary emergency contact updated');
});
