/**
 * File Upload Service Wrapper
 *
 * This is a compatibility wrapper around file.service.ts
 * to maintain existing imports in controllers
 */

import { fileService } from './file.service.js';

export const fileUploadService = fileService;
export default fileUploadService;
