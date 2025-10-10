import { Document } from '@prisma/client';

export function createMockDocument(overrides?: Partial<Document>): Document {
  const defaultDocument: Document = {
    id: overrides?.id || `document-${Math.random().toString(36).substr(2, 9)}`,
    pitchId: overrides?.pitchId || 'pitch-id',
    name: overrides?.name || 'pitch-deck.pdf',
    fileUrl: overrides?.fileUrl || 'https://storage.example.com/documents/pitch-deck.pdf',
    fileType: overrides?.fileType || 'application/pdf',
    fileSize: overrides?.fileSize || 2048000,
    createdAt: overrides?.createdAt || new Date(),
    updatedAt: overrides?.updatedAt || new Date(),
  };

  return {
    ...defaultDocument,
    ...overrides,
  };
}
