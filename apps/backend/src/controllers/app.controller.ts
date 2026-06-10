import { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { getPresignedApkUrl, DOWNLOAD_ERROR_MESSAGE } from '../services/app-download.service';

export const downloadMobileApp = asyncHandler(async (_req: Request, res: Response) => {
  try {
    const url = await getPresignedApkUrl();
    res.status(200).json({ url });
  } catch {
    res.status(503).json({ error: DOWNLOAD_ERROR_MESSAGE });
  }
});
