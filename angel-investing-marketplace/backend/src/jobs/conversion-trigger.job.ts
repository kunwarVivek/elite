import { prisma } from '../config/database.js';
import { logger } from '../config/logger.js';
import { safeService } from '../services/safe.service.js';
import { convertibleNoteService } from '../services/convertible-note.service.js';

/**
 * Conversion Trigger Background Job
 *
 * Checks for qualified financing events and triggers automatic conversions
 * for SAFEs and convertible notes that have auto-conversion enabled
 *
 * A qualified financing event typically occurs when:
 * - A startup raises a new equity round
 * - The round amount exceeds the qualified financing threshold
 * - The round has a defined price per share
 */
export async function conversionTriggerJob() {
  const startTime = Date.now();
  let safesProcessed = 0;
  let notesProcessed = 0;
  let conversionsTriggered = 0;
  let errorCount = 0;
  const errors: Array<{ id: string; type: string; error: string }> = [];

  try {
    logger.info('Starting conversion trigger job...');

    // Step 1: Find recent equity rounds that might trigger conversions
    // Look for rounds created in the last 7 days
    const recentDate = new Date();
    recentDate.setDate(recentDate.getDate() - 7);

    const recentRounds = await prisma.equityRound.findMany({
      where: {
        createdAt: {
          gte: recentDate,
        },
        status: {
          in: ['OPEN', 'ACTIVE', 'CLOSED'],
        },
        pricePerShare: {
          not: null,
        },
      },
      include: {
        startup: true,
      },
    });

    logger.info(`Found ${recentRounds.length} recent equity rounds to check`);

    // Step 2: For each round, check for SAFEs and notes that should convert
    for (const round of recentRounds) {
      try {
        const roundAmount = Number(round.totalRaised || round.targetAmount);
        const pricePerShare = Number(round.pricePerShare);
        const roundValuation = Number(round.postMoneyValuation || round.preMoneyValuation);

        logger.debug('Processing round for conversions', {
          roundId: round.id,
          startupId: round.startupId,
          startupName: round.startup.name,
          roundAmount,
          pricePerShare,
          roundValuation,
        });

        // Step 2a: Check for SAFEs to convert
        const activeSafes = await prisma.safeAgreement.findMany({
          where: {
            status: 'ACTIVE',
            investment: {
              pitch: {
                startupId: round.startupId,
              },
            },
          },
          include: {
            investment: {
              include: {
                investor: {
                  select: {
                    id: true,
                    email: true,
                    name: true,
                  },
                },
                pitch: {
                  include: {
                    startup: {
                      select: {
                        id: true,
                        name: true,
                      },
                    },
                  },
                },
              },
            },
          },
        });

        logger.info(`Found ${activeSafes.length} active SAFEs for startup ${round.startup.name}`);

        for (const safe of activeSafes) {
          try {
            // Check if this is a qualified financing event
            const qualifiedFinancingThreshold = Number(safe.qualifiedFinancingThreshold || 0);
            const isQualified = roundAmount >= qualifiedFinancingThreshold;

            if (!isQualified) {
              logger.debug('Round does not meet qualified financing threshold for SAFE', {
                safeId: safe.id,
                roundAmount,
                threshold: qualifiedFinancingThreshold,
              });
              continue;
            }

            // Auto-convert if enabled
            if (safe.autoConversion) {
              logger.info('Auto-converting SAFE', {
                safeId: safe.id,
                roundId: round.id,
                investorName: safe.investment.investor.name,
                investmentAmount: Number(safe.investmentAmount),
              });

              const result = await safeService.convertSafe(
                safe.id,
                round.id,
                pricePerShare,
                roundValuation
              );

              conversionsTriggered++;

              logger.info('SAFE auto-converted successfully', {
                safeId: safe.id,
                roundId: round.id,
                shares: result.shares,
                conversionPrice: result.conversionPrice,
              });

              // TODO: Send notification to investor and founder
              // await notificationService.sendConversionNotice(safe, result);
            } else {
              // Just log that manual conversion is available
              logger.info('SAFE eligible for manual conversion', {
                safeId: safe.id,
                roundId: round.id,
                investorName: safe.investment.investor.name,
              });

              // TODO: Send notification to founder about conversion opportunity
              // await notificationService.sendConversionOpportunity(safe, round);
            }

            safesProcessed++;
          } catch (error: any) {
            errorCount++;
            errors.push({
              id: safe.id,
              type: 'SAFE',
              error: error.message || 'Unknown error',
            });

            logger.error('Error processing SAFE conversion', {
              safeId: safe.id,
              error: error.message,
              stack: error.stack,
            });
          }
        }

        // Step 2b: Check for convertible notes to convert
        const activeNotes = await prisma.convertibleNote.findMany({
          where: {
            status: 'ACTIVE',
            investment: {
              pitch: {
                startupId: round.startupId,
              },
            },
          },
          include: {
            investment: {
              include: {
                investor: {
                  select: {
                    id: true,
                    email: true,
                    name: true,
                  },
                },
                pitch: {
                  include: {
                    startup: {
                      select: {
                        id: true,
                        name: true,
                      },
                    },
                  },
                },
              },
            },
          },
        });

        logger.info(`Found ${activeNotes.length} active notes for startup ${round.startup.name}`);

        for (const note of activeNotes) {
          try {
            // Check if this is a qualified financing event
            const isQualified = await convertibleNoteService.checkQualifiedFinancing(
              note.id,
              roundAmount
            );

            if (!isQualified) {
              logger.debug('Round does not meet qualified financing threshold for note', {
                noteId: note.id,
                roundAmount,
                threshold: Number(note.qualifiedFinancingThreshold || 0),
              });
              continue;
            }

            // Auto-convert if enabled
            if (note.autoConversion) {
              logger.info('Auto-converting convertible note', {
                noteId: note.id,
                roundId: round.id,
                investorName: note.investment.investor.name,
                principalAmount: Number(note.principalAmount),
                accruedInterest: Number(note.accruedInterest),
              });

              const result = await convertibleNoteService.convertNote(
                note.id,
                pricePerShare
              );

              conversionsTriggered++;

              logger.info('Convertible note auto-converted successfully', {
                noteId: note.id,
                roundId: round.id,
                shares: result.shares,
                conversionPrice: result.conversionPrice,
                totalAmount: result.totalAmount,
              });

              // TODO: Send notification to investor and founder
              // await notificationService.sendConversionNotice(note, result);
            } else {
              // Just log that manual conversion is available
              logger.info('Convertible note eligible for manual conversion', {
                noteId: note.id,
                roundId: round.id,
                investorName: note.investment.investor.name,
              });

              // TODO: Send notification to founder about conversion opportunity
              // await notificationService.sendConversionOpportunity(note, round);
            }

            notesProcessed++;
          } catch (error: any) {
            errorCount++;
            errors.push({
              id: note.id,
              type: 'NOTE',
              error: error.message || 'Unknown error',
            });

            logger.error('Error processing note conversion', {
              noteId: note.id,
              error: error.message,
              stack: error.stack,
            });
          }
        }
      } catch (error: any) {
        errorCount++;
        errors.push({
          id: round.id,
          type: 'ROUND',
          error: error.message || 'Unknown error',
        });

        logger.error('Error processing round for conversions', {
          roundId: round.id,
          error: error.message,
          stack: error.stack,
        });
      }
    }

    const duration = Date.now() - startTime;

    logger.info('Conversion trigger job completed', {
      recentRounds: recentRounds.length,
      safesProcessed,
      notesProcessed,
      conversionsTriggered,
      errorCount,
      duration: `${duration}ms`,
      errors: errorCount > 0 ? errors : undefined,
    });

    // Return summary for monitoring
    return {
      success: true,
      recentRounds: recentRounds.length,
      safesProcessed,
      notesProcessed,
      conversionsTriggered,
      errorCount,
      duration,
      errors: errorCount > 0 ? errors : undefined,
    };
  } catch (error: any) {
    const duration = Date.now() - startTime;

    logger.error('Conversion trigger job failed', {
      error: error.message,
      stack: error.stack,
      duration: `${duration}ms`,
      safesProcessed,
      notesProcessed,
      conversionsTriggered,
      errorCount,
    });

    throw error;
  }
}
