import { describe, expect, it } from 'vitest';
import {
  attendanceQueueId,
  partitionBatchResultsForQueue,
} from '../client/offline/db';

describe('attendance offline queue helpers', () => {
  it('builds LWW queue key as meetingId:catechumenProfileId', () => {
    expect(attendanceQueueId('m1', 'c1')).toBe('m1:c1');
  });

  it('clears only applied outcomes from the queue partition', () => {
    const { clearIds, conflicts } = partitionBatchResultsForQueue(
      'm1',
      [
        {
          catechumenProfileId: 'a',
          outcome: 'applied',
          status: 'PRESENT',
          updatedAt: '2026-01-01T00:00:00.000Z',
        },
        {
          catechumenProfileId: 'b',
          outcome: 'conflict',
          serverStatus: 'ABSENT',
          serverUpdatedAt: '2026-01-01T00:01:00.000Z',
        },
        {
          catechumenProfileId: 'c',
          outcome: 'skipped',
        },
      ],
      '2026-01-01T00:02:00.000Z',
    );

    expect(clearIds).toEqual(['m1:a']);
    expect(conflicts).toHaveLength(1);
    expect(conflicts[0]).toMatchObject({
      catechumenProfileId: 'b',
      serverStatus: 'ABSENT',
      serverUpdatedAt: '2026-01-01T00:01:00.000Z',
      serverTime: '2026-01-01T00:02:00.000Z',
    });
    // skipped stays in queue (not cleared)
    expect(clearIds).not.toContain('m1:c');
  });

  it('prefers serverStatus over status on conflict', () => {
    const { conflicts } = partitionBatchResultsForQueue('m9', [
      {
        catechumenProfileId: 'x',
        outcome: 'conflict',
        status: 'PRESENT',
        serverStatus: 'LATE',
        updatedAt: 't1',
        serverUpdatedAt: 't2',
      },
    ]);
    expect(conflicts[0].serverStatus).toBe('LATE');
    expect(conflicts[0].serverUpdatedAt).toBe('t2');
  });
});
