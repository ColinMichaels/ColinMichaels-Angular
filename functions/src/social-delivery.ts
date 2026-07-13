export type ReconciledSocialAnnouncementStatus = 'queued' | 'posted' | 'failed' | 'cancelled';

/**
 * Reconciles a stale post announcement with its deterministic outbox record.
 * Existing delivery work always wins so importing an older post snapshot cannot
 * reset pending or completed provider work for a second delivery.
 */
export function reconcileSocialAnnouncementStatus(
  existingDeliveryStatus: unknown
): ReconciledSocialAnnouncementStatus {
  switch (existingDeliveryStatus) {
    case 'posted':
      return 'posted';
    case 'failed':
      return 'failed';
    case 'cancelled':
      return 'cancelled';
    default:
      return 'queued';
  }
}
