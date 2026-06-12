import type { ReportCategory } from '@prisma/client';
import { prisma } from '../config/database';
import { AppError } from '../middleware/error.middleware';
import { logger } from '../config/logger';
import { sendPoliceAlertEmail } from './email.service';
import { calculateIncidentScore, determinePinColor } from '../utils/incidentScore';

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

type IncidentAlertPayload = {
  incidentId: string;
  incidentType: string;
  latitude: number;
  longitude: number;
  score: number;
  likes: number;
  commentCount: number;
  createdAt: Date;
  description?: string | null;
} | null;

function buildAlertPayload(data: {
  id: string;
  category: ReportCategory;
  latitude: number;
  longitude: number;
  score: number;
  upvoteCount: number;
  createdAt: Date;
  description?: string | null;
  commentCount: number;
  pinColor: string;
  previousPinColor: string;
  alertSent: boolean;
}): IncidentAlertPayload {
  if (data.pinColor !== 'red' || data.previousPinColor === 'red' || data.alertSent) {
    return null;
  }

  return {
    incidentId: data.id,
    incidentType: data.category,
    latitude: data.latitude,
    longitude: data.longitude,
    score: data.score,
    likes: data.upvoteCount,
    commentCount: data.commentCount,
    createdAt: data.createdAt,
    description: data.description,
  };
}

function dispatchPoliceAlertEmail(payload: IncidentAlertPayload): void {
  if (!payload) return;

  void sendPoliceAlertEmail(payload).catch((error) => {
    logger.error('Unexpected police alert email error', { incidentId: payload.incidentId, error });
  });
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
      score: 0,
      pinColor: 'white',
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
        score: true,
        pinColor: true,
        isVerified: true,
        isAnonymous: true,
        imageUrls: true,
        createdAt: true,
        comments: {
          orderBy: { createdAt: 'desc' },
          take: 3,
          select: {
            id: true,
            content: true,
            createdAt: true,
            user: {
              select: {
                fullName: true,
              },
            },
          },
        },
        _count: {
          select: {
            comments: true,
          },
        },
      },
    }),
    prisma.communityReport.count({ where }),
  ]);

  return {
    reports: reports.map((report) => ({
      ...report,
      comments: report.comments.map((comment) => ({
        id: comment.id,
        content: comment.content,
        createdAt: comment.createdAt,
        authorName: comment.user.fullName,
      })),
      commentCount: report._count.comments,
    })),
    pagination: { total, page, limit, totalPages: Math.ceil(total / limit) },
  };
}

export async function getIncidents() {
  const incidents = await prisma.communityReport.findMany({
    where: { isActive: true },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      category: true,
      title: true,
      description: true,
      latitude: true,
      longitude: true,
      upvoteCount: true,
      score: true,
      pinColor: true,
      createdAt: true,
      comments: {
        orderBy: { createdAt: 'desc' },
        take: 3,
        select: {
          id: true,
          content: true,
          createdAt: true,
          user: {
            select: {
              fullName: true,
            },
          },
        },
      },
      _count: {
        select: {
          comments: true,
        },
      },
    },
  });

  return incidents.map((incident) => ({
    id: incident.id,
    type: incident.category,
    title: incident.title,
    description: incident.description,
    latitude: incident.latitude,
    longitude: incident.longitude,
    likes: incident.upvoteCount,
    comments: incident._count.comments,
    score: incident.score,
    pinColor: incident.pinColor,
    createdAt: incident.createdAt,
    previewComments: incident.comments.map((comment) => ({
      id: comment.id,
      content: comment.content,
      createdAt: comment.createdAt,
      authorName: comment.user.fullName,
    })),
  }));
}

export async function upvoteReport(reportId: string, userId: string) {
  let alertPayload: IncidentAlertPayload = null;

  const result = await prisma.$transaction(async (tx) => {
    const report = await tx.communityReport.findUnique({
      where: { id: reportId },
      select: {
        id: true,
        category: true,
        latitude: true,
        longitude: true,
        description: true,
        createdAt: true,
        upvoteCount: true,
        pinColor: true,
        alertSent: true,
        isActive: true,
      },
    });

    if (!report || !report.isActive) throw new AppError('Report not found', 404);

    const existing = await tx.reportUpvote.findUnique({
      where: { reportId_userId: { reportId, userId } },
    });

    const upvoted = !existing;

    if (existing) {
      await tx.reportUpvote.delete({ where: { reportId_userId: { reportId, userId } } });
    } else {
      await tx.reportUpvote.create({ data: { reportId, userId } });
    }

    const updatedLikes = Math.max(report.upvoteCount + (upvoted ? 1 : -1), 0);
    const commentCount = await tx.reportComment.count({ where: { reportId } });
    const score = calculateIncidentScore(updatedLikes, commentCount);
    const pinColor = determinePinColor(score);
    const shouldMarkAlertSent = pinColor === 'red' && report.pinColor !== 'red' && !report.alertSent;

    const updatedReport = await tx.communityReport.update({
      where: { id: reportId },
      data: {
        upvoteCount: updatedLikes,
        score,
        pinColor,
        ...(shouldMarkAlertSent ? { alertSent: true } : {}),
      },
      select: {
        id: true,
        category: true,
        latitude: true,
        longitude: true,
        description: true,
        createdAt: true,
        upvoteCount: true,
        score: true,
        pinColor: true,
        alertSent: true,
      },
    });

    alertPayload = buildAlertPayload({
      ...updatedReport,
      commentCount,
      previousPinColor: report.pinColor,
      alertSent: report.alertSent,
    });

    return {
      upvoted,
      likes: updatedReport.upvoteCount,
      score: updatedReport.score,
      pinColor: updatedReport.pinColor,
      commentCount,
    };
  });

  dispatchPoliceAlertEmail(alertPayload);
  return result;
}

export async function addComment(reportId: string, userId: string, content: string) {
  let alertPayload: IncidentAlertPayload = null;

  const result = await prisma.$transaction(async (tx) => {
    const report = await tx.communityReport.findUnique({
      where: { id: reportId },
      select: {
        id: true,
        category: true,
        latitude: true,
        longitude: true,
        description: true,
        createdAt: true,
        upvoteCount: true,
        pinColor: true,
        alertSent: true,
        isActive: true,
      },
    });

    if (!report || !report.isActive) throw new AppError('Report not found', 404);

    const comment = await tx.reportComment.create({
      data: {
        reportId,
        userId,
        content,
      },
      select: {
        id: true,
        content: true,
        createdAt: true,
        user: {
          select: {
            fullName: true,
          },
        },
      },
    });

    const commentCount = await tx.reportComment.count({ where: { reportId } });
    const score = calculateIncidentScore(report.upvoteCount, commentCount);
    const pinColor = determinePinColor(score);
    const shouldMarkAlertSent = pinColor === 'red' && report.pinColor !== 'red' && !report.alertSent;

    const updatedReport = await tx.communityReport.update({
      where: { id: reportId },
      data: {
        score,
        pinColor,
        ...(shouldMarkAlertSent ? { alertSent: true } : {}),
      },
      select: {
        id: true,
        category: true,
        latitude: true,
        longitude: true,
        description: true,
        createdAt: true,
        upvoteCount: true,
        score: true,
        pinColor: true,
        alertSent: true,
      },
    });

    alertPayload = buildAlertPayload({
      ...updatedReport,
      commentCount,
      previousPinColor: report.pinColor,
      alertSent: report.alertSent,
    });

    return {
      comment: {
        id: comment.id,
        content: comment.content,
        createdAt: comment.createdAt,
        authorName: comment.user.fullName,
      },
      score: updatedReport.score,
      pinColor: updatedReport.pinColor,
      likes: updatedReport.upvoteCount,
      commentCount,
    };
  });

  dispatchPoliceAlertEmail(alertPayload);
  return result;
}

export async function getHeatmapData(radiusKm = 50, centerLat = 20.5937, centerLng = 78.9629) {
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

  return points.map((point) => ({
    latitude: point.latitude,
    longitude: point.longitude,
    weight: 1 + Number(point.upvote_count) * 0.5,
  }));
}
