import { prisma } from '../config/database.js';
import { logger } from '../config/logger.js';
import { convertibleNoteService } from '../services/convertible-note.service.js';

/**
 * Interest Accrual Background Job
 *
 * Runs daily to accrue interest on all active convertible notes
 * This ensures that interest is calculated accurately and up-to-date
 * for reporting, conversion, and maturity calculations
 */
export async function interestAccrualJob() {
  const startTime = Date.now();
  let processedCount = 0;
  let errorCount = 0;
  const errors: Array<{ noteId: string; error: string }> = [];

  try {
    logger.info('Starting interest accrual job...');

    // Get all active convertible notes
    const activeNotes = await prisma.convertibleNote.findMany({
      where: {
        status: 'ACTIVE',
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
                    founderId: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    logger.info(`Found ${activeNotes.length} active convertible notes to process`);

    // Process each note
    for (const note of activeNotes) {
      try {
        // Calculate and accrue interest
        const updatedNote = await convertibleNoteService.accrueInterest(note.id);

        const accruedInterest = Number(updatedNote.accruedInterest);
        const principalAmount = Number(updatedNote.principalAmount);

        logger.debug('Interest accrued for note', {
          noteId: note.id,
          startupId: note.investment.pitch.startup.id,
          startupName: note.investment.pitch.startup.name,
          investorId: note.investment.investor.id,
          investorName: note.investment.investor.name,
          principalAmount,
          accruedInterest,
          totalAmount: principalAmount + accruedInterest,
        });

        // Check if note is approaching maturity (within 30 days)
        const daysToMaturity = Math.floor(
          (note.maturityDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
        );

        if (daysToMaturity <= 30 && daysToMaturity > 0) {
          logger.warn('Convertible note approaching maturity', {
            noteId: note.id,
            startupName: note.investment.pitch.startup.name,
            daysToMaturity,
            maturityDate: note.maturityDate,
            totalAmount: principalAmount + accruedInterest,
          });

          // TODO: Send notification to startup founder and investor
          // await notificationService.sendMaturityReminder(note);
        }

        // Check if note is past maturity
        if (daysToMaturity < 0) {
          logger.error('Convertible note past maturity date', {
            noteId: note.id,
            startupName: note.investment.pitch.startup.name,
            daysOverdue: Math.abs(daysToMaturity),
            maturityDate: note.maturityDate,
            totalAmount: principalAmount + accruedInterest,
          });

          // TODO: Send urgent notification and escalate
          // await notificationService.sendOverdueNotice(note);
        }

        processedCount++;
      } catch (error: any) {
        errorCount++;
        errors.push({
          noteId: note.id,
          error: error.message || 'Unknown error',
        });

        logger.error('Error processing note in interest accrual job', {
          noteId: note.id,
          error: error.message,
          stack: error.stack,
        });
      }
    }

    const duration = Date.now() - startTime;

    logger.info('Interest accrual job completed', {
      totalNotes: activeNotes.length,
      processedCount,
      errorCount,
      duration: `${duration}ms`,
      errors: errorCount > 0 ? errors : undefined,
    });

    // Return summary for monitoring
    return {
      success: true,
      totalNotes: activeNotes.length,
      processedCount,
      errorCount,
      duration,
      errors: errorCount > 0 ? errors : undefined,
    };
  } catch (error: any) {
    const duration = Date.now() - startTime;

    logger.error('Interest accrual job failed', {
      error: error.message,
      stack: error.stack,
      duration: `${duration}ms`,
      processedCount,
      errorCount,
    });

    throw error;
  }
}
