import { prisma } from '../config/database';
import { AppError } from '../middleware/error.middleware';
import type { ReportCategory } from '@prisma/client';

export interface CreateReportInput {
  reporterId?: string;
  isAnonymous?: boolean;
  category: ReportCategory;
  title?: string;
  description?: string;
  latitude: number;
  longitude: number;
  address?: string;
  city?: string;
}

export interface GetReportsQuery {
  latitude?: number;
  longitude?: number;
  radiusKm?: number;
  category?: ReportCategory;
  page?: number;
  limit?: number;
}

export async function createReport(input: CreateReportInput) {
  return prisma.communityReport.create({
    data: {
      reporterId: input.isAnonymous ? null : (input.reporterId ?? null),
      isAnonymous: input.isAnonymous ?? true,
      category: input.category,
      title: input.title,
      description: input.description,
      latitude: input.latitude,
      longitude: input.longitude,
      address: input.address,
      city: input.city,
    },
  });
}

export async function getReports(query: GetReportsQuery) {
  const { category, page = 1, limit = 20 } = query;
  const skip = (page - 1) * limit;

  const where = {
    isActive: true,
    ...(category ? { category } : {}),
  };

  const [reports, total] = await prisma.$transaction([
    prisma.communityReport.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
      select: {
        id: true,
        category: true,
        title: true,
        description: true,
        latitude: true,
        longitude: true,
        address: true,
        city: true,
        upvoteCount: true,
        isVerified: true,
        isAnonymous: true,
        imageUrls: true,
        createdAt: true,
      },
    }),
    prisma.communityReport.count({ where }),
  ]);

  return {
    reports,
    pagination: { total, page, limit, totalPages: Math.ceil(total / limit) },
  };
}

export async function upvoteReport(reportId: string, userId: string) {
  const report = await prisma.communityReport.findUnique({ where: { id: reportId } });
  if (!report || !report.isActive) throw new AppError('Report not found', 404);

  // Toggle upvote
  const existing = await prisma.reportUpvote.findUnique({
    where: { reportId_userId: { reportId, userId } },
  });

  if (existing) {
    await prisma.$transaction([
      prisma.reportUpvote.delete({ where: { reportId_userId: { reportId, userId } } }),
      prisma.communityReport.update({
        where: { id: reportId },
        data: { upvoteCount: { decrement: 1 } },
      }),
    ]);
    return { upvoted: false };
  }

  await prisma.$transaction([
    prisma.reportUpvote.create({ data: { reportId, userId } }),
    prisma.communityReport.update({
      where: { id: reportId },
      data: { upvoteCount: { increment: 1 } },
    }),
  ]);

  return { upvoted: true };
}

export async function getHeatmapData(radiusKm = 50, centerLat = 20.5937, centerLng = 78.9629) {
  // Return recent reports as heatmap points (lat, lng, weight)
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  type ReportPoint = { latitude: number; longitude: number; upvote_count: number };

  const points = await prisma.$queryRaw<ReportPoint[]>`
    SELECT
      latitude,
      longitude,
      upvote_count
    FROM community_reports
    WHERE
      is_active = true
      AND created_at >= ${thirtyDaysAgo}
      AND (
        6371 * acos(
          cos(radians(${centerLat})) * cos(radians(latitude)) *
          cos(radians(longitude) - radians(${centerLng})) +
          sin(radians(${centerLat})) * sin(radians(latitude))
        )
      ) <= ${radiusKm}
    ORDER BY created_at DESC
    LIMIT 500
  `;

  return points.map((p) => ({
    latitude: p.latitude,
    longitude: p.longitude,
    weight: 1 + Number(p.upvote_count) * 0.5,
  }));
}
