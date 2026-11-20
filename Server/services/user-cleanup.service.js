'use strict';

const { Op } = require('sequelize');
const models = require('../sequelize/models');
const logger = require('../app/logger');

const DEFAULT_MAX_AGE_MS = 24 * 60 * 60 * 1000; // 24 hours
const DEFAULT_CLEANUP_INTERVAL_MS = 60 * 60 * 1000; // 1 hour

module.exports = {
  /**
   * Removes orphaned temporary guest users older than maxAgeMs that are not referenced
   * by any GameRoom or UsersGameRooms row (preserving FK integrity and room history).
   */
  async cleanupStaleTemporaryUsers(maxAgeMs = DEFAULT_MAX_AGE_MS) {
    const cutoffDate = new Date(Date.now() - maxAgeMs);
    const staleGuests = await models.User.findAll({
      attributes: ['id'],
      where: {
        temporary: true,
        createdAt: {
          [Op.lt]: cutoffDate
        }
      },
      raw: true
    });

    if (!staleGuests || staleGuests.length === 0) {
      return 0;
    }

    const candidateIds = staleGuests.map(u => u.id);

    const [memberRefs, ownerRefs] = await Promise.all([
      models.UsersGameRooms.findAll({
        attributes: ['userId'],
        where: { userId: { [Op.in]: candidateIds } },
        raw: true
      }),
      models.GameRoom.findAll({
        attributes: ['ownerId'],
        where: { ownerId: { [Op.in]: candidateIds } },
        raw: true
      })
    ]);

    const referencedIds = new Set([
      ...memberRefs.map(r => r.userId),
      ...ownerRefs.map(r => r.ownerId)
    ]);

    const orphanIds = candidateIds.filter(id => !referencedIds.has(id));
    if (orphanIds.length === 0) {
      return 0;
    }

    const deletedCount = await models.User.destroy({
      where: {
        id: { [Op.in]: orphanIds },
        temporary: true
      }
    });

    if (deletedCount > 0) {
      logger.info('Cleaned up orphaned temporary guest users', { deletedCount });
    }
    return deletedCount;
  },

  /**
   * Starts a background timer to periodically purge orphaned temporary guest users.
   */
  startPeriodicCleanup(intervalMs = DEFAULT_CLEANUP_INTERVAL_MS, maxAgeMs = DEFAULT_MAX_AGE_MS) {
    const timer = setInterval(() => {
      this.cleanupStaleTemporaryUsers(maxAgeMs).catch(err => {
        logger.error('Failed to cleanup stale temporary users', err);
      });
    }, intervalMs);

    if (timer.unref) {
      timer.unref();
    }
    return timer;
  }
};
