// Documents API Routes - GET (list) and POST (create metadata)
// Compatible with both web and mobile clients
// Actual file upload is handled by UploadThing

import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { DocumentType, DocumentStatus } from '@prisma/client';
import { ERROR_MESSAGES, SUCCESS_MESSAGES, PAGINATION } from '@/lib/constants';
import { logger } from '@/lib/utils/logger';
import { successResponse } from '@/lib/utils/api-response';
import { asyncHandler, ApiError, HttpStatus } from '@/lib/utils/error-handler';
import { withCorsMiddleware } from '@/lib/middleware/cors';
import { withRateLimit, RateLimitPresets } from '@/lib/middleware/rate-limit';
import { authenticateToken, AuthenticatedRequest } from '@/lib/auth/middleware';

// GET /api/documents - List all documents (with filters)
const getHandler = asyncHandler(async (request: NextRequest) => {
  const req = request as AuthenticatedRequest;

  if (!req.user) {
    throw new ApiError(ERROR_MESSAGES.UNAUTHORIZED, HttpStatus.UNAUTHORIZED);
  }

  const { searchParams } = new URL(request.url);
  const caseId = searchParams.get('caseId');
  const type = searchParams.get('type'); // DocumentType enum (PASSPORT, ID_CARD, etc.)
  const extensionType = searchParams.get('extensionType'); // ALL, PDF, IMAGE, DOC, DOCX, XLS, XLSX
  const status = searchParams.get('status'); // ALL, PENDING, APPROVED, REJECTED
  const pageParam = searchParams.get('page');
  const limitParam = searchParams.get('limit');

  // Validate and parse page
  const page = pageParam ? Math.max(1, parseInt(pageParam, 10) || 1) : 1;

  // Validate and clamp limit
  let limit = limitParam ? parseInt(limitParam, 10) : 20;

  if (isNaN(limit) || limit <= 0) {
    throw new ApiError('Limit must be a positive integer', HttpStatus.BAD_REQUEST);
  }

  // Clamp limit to MAX_LIMIT to prevent excessive resource usage
  limit = Math.min(limit, PAGINATION.MAX_LIMIT);

  const skip = (page - 1) * limit;

  const where: any = {};

  // Role-based filtering
  if (req.user.role === 'CLIENT') {
    where.uploadedById = req.user.userId;
  }

  if (caseId) {
    where.caseId = caseId;
  }

  // Filter by DocumentType enum (PASSPORT, ID_CARD, etc.)
  if (type) {
    // Validate that type is a valid DocumentType enum value
    const validDocumentTypes = Object.values(DocumentType);
    if (validDocumentTypes.includes(type as DocumentType)) {
      where.documentType = type as DocumentType;
    } else {
      // Invalid document type - log warning but don't filter by type
      logger.warn('Invalid document type in query parameter', {
        type,
        validTypes: validDocumentTypes,
        userId: req.user.userId,
      });
      // Don't filter by type if invalid - return all documents
    }
  }

  // Filter by extension type (PDF, IMAGE, DOC, DOCX, XLS, XLSX, or ALL)
  if (extensionType && extensionType !== 'ALL') {
    if (extensionType === 'PDF') {
      where.mimeType = 'application/pdf';
    } else if (extensionType === 'DOC') {
      where.mimeType = 'application/msword';
    } else if (extensionType === 'DOCX') {
      where.mimeType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
    } else if (extensionType === 'XLS') {
      where.mimeType = 'application/vnd.ms-excel';
    } else if (extensionType === 'XLSX') {
      where.mimeType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
    } else if (extensionType === 'IMAGE') {
      where.mimeType = {
        startsWith: 'image/',
      };
    } else {
      // Invalid extension type - log warning
      logger.warn('Invalid extension type in query parameter', {
        extensionType,
        validTypes: ['ALL', 'PDF', 'IMAGE', 'DOC', 'DOCX', 'XLS', 'XLSX'],
        userId: req.user.userId,
      });
    }
  }

  // Filter by document status (PENDING, APPROVED, REJECTED, or ALL)
  if (status && status !== 'ALL') {
    // Validate that status is a valid DocumentStatus enum value
    const validStatuses = Object.values(DocumentStatus);
    if (validStatuses.includes(status as DocumentStatus)) {
      where.status = status as DocumentStatus;
    } else {
      // Invalid status - log warning but don't filter by status
      logger.warn('Invalid document status in query parameter', {
        status,
        validStatuses,
        userId: req.user.userId,
      });
    }
  }

  const [documents, total] = await Promise.all([
    prisma.document.findMany({
      where,
      include: {
        case: {
          select: {
            id: true,
            referenceNumber: true,
            serviceType: true,
            status: true,
          },
        },
        uploadedBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
      orderBy: { uploadDate: 'desc' },
      skip,
      take: limit,
    }),
    prisma.document.count({ where }),
  ]);

  logger.info('Documents retrieved', {
    userId: req.user.userId,
    count: documents.length,
  });

  return successResponse(
    {
      documents,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    },
    'Documents retrieved successfully'
  );
});

// POST /api/documents - Save document metadata after UploadThing upload
const postHandler = asyncHandler(async (request: NextRequest) => {
  const req = request as AuthenticatedRequest;

  if (!req.user) {
    throw new ApiError(ERROR_MESSAGES.UNAUTHORIZED, HttpStatus.UNAUTHORIZED);
  }

  const body = await request.json();
  const { fileName, originalName, filePath, fileSize, mimeType, documentType, caseId } = body;

  // Validation
  if (!fileName || !filePath || !mimeType || !documentType || !caseId) {
    throw new ApiError(
      'fileName, filePath, mimeType, documentType, and caseId are required',
      HttpStatus.BAD_REQUEST
    );
  }

  // Verify case exists and access
  const caseData = await prisma.case.findUnique({
    where: { id: caseId },
  });

  if (!caseData) {
    throw new ApiError('Case not found', HttpStatus.NOT_FOUND);
  }

  if (req.user.role === 'CLIENT' && caseData.clientId !== req.user.userId) {
    throw new ApiError(ERROR_MESSAGES.FORBIDDEN, HttpStatus.FORBIDDEN);
  }

  // Create document record
  const document = await prisma.document.create({
    data: {
      fileName,
      originalName: originalName || fileName,
      filePath,
      fileSize: fileSize || 0,
      mimeType,
      documentType,
      caseId,
      uploadedById: req.user.userId,
    },
    include: {
      case: {
        select: {
          id: true,
          referenceNumber: true,
          serviceType: true,
        },
      },
    },
  });

  logger.info('Document metadata saved', {
    documentId: document.id,
    userId: req.user.userId,
  });

  return successResponse({ document }, SUCCESS_MESSAGES.CREATED, HttpStatus.CREATED);
});

// Apply middleware and authentication
export const GET = withCorsMiddleware(
  withRateLimit(authenticateToken(getHandler), RateLimitPresets.STANDARD)
);

export const POST = withCorsMiddleware(
  withRateLimit(authenticateToken(postHandler), RateLimitPresets.STANDARD)
);
