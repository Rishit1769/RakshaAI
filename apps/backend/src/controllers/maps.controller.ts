import { Request, Response } from 'express';
import * as MapsService from '../services/maps.service';
import { asyncHandler } from '../utils/asyncHandler';
import { sendSuccess } from '../utils/response';

/**
 * GET /api/maps/nearby/volunteers?latitude=&longitude=&radius=
 */
export const nearbyVolunteers = asyncHandler(async (req: Request, res: Response) => {
  const latitude = parseFloat(req.query.latitude as string);
  const longitude = parseFloat(req.query.longitude as string);
  const radiusKm = parseFloat((req.query.radius as string) ?? '5');

  const data = await MapsService.getNearbyVolunteers({ latitude, longitude, radiusKm });
  sendSuccess(res, data, 'Nearby volunteers retrieved');
});

/**
 * GET /api/maps/nearby/police?latitude=&longitude=&radius=
 */
export const nearbyPolice = asyncHandler(async (req: Request, res: Response) => {
  const latitude = parseFloat(req.query.latitude as string);
  const longitude = parseFloat(req.query.longitude as string);
  const radiusKm = parseFloat((req.query.radius as string) ?? '10');

  const data = await MapsService.getNearbyPoliceStations({ latitude, longitude, radiusKm });
  sendSuccess(res, data, 'Nearby police stations retrieved');
});

/**
 * GET /api/maps/nearby/safe-zones?latitude=&longitude=&radius=
 */
export const nearbySafeZones = asyncHandler(async (req: Request, res: Response) => {
  const latitude = parseFloat(req.query.latitude as string);
  const longitude = parseFloat(req.query.longitude as string);
  const radiusKm = parseFloat((req.query.radius as string) ?? '5');

  const data = await MapsService.getNearbySafeZones({ latitude, longitude, radiusKm });
  sendSuccess(res, data, 'Nearby safe zones retrieved');
});

/**
 * GET /api/maps/risk?latitude=&longitude=&radius=
 */
export const areaRisk = asyncHandler(async (req: Request, res: Response) => {
  const latitude = parseFloat(req.query.latitude as string);
  const longitude = parseFloat(req.query.longitude as string);
  const radiusKm = parseFloat((req.query.radius as string) ?? '2');

  const data = await MapsService.getAreaRiskData({ latitude, longitude, radiusKm });
  sendSuccess(res, data, 'Area risk data retrieved');
});
