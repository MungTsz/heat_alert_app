// AsyncStorage ships as ESM, which jest doesn't transform — and this suite
// only exercises the pure selector anyway.
jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: { getItem: jest.fn(), setItem: jest.fn(), removeItem: jest.fn() },
}));

import { selectRecentMessages } from '../useAlertMessageLog';
import { ALERT_MESSAGE_LOG_CONFIG } from '../../config/alertConfig';
import { AlertMessageRecord } from '../../types/alerts';

const NOW = Date.UTC(2026, 10, 12, 4);
const HOUR = 60 * 60 * 1000;

const record = (id: string, hoursAgo: number): AlertMessageRecord => ({
  id,
  title: id,
  body: '',
  sentAtMs: NOW - hoursAgo * HOUR,
  urgent: false,
  items: [],
});

describe('selectRecentMessages', () => {
  it('lists newest first, whatever order the log is in', () => {
    const log = [record('b', 5), record('a', 1), record('c', 9)];
    expect(selectRecentMessages(log, 10, NOW).map(r => r.id)).toEqual(['a', 'b', 'c']);
  });

  it('shows at most the given number', () => {
    const log = Array.from({ length: 15 }, (_, i) => record(`m${i}`, i));
    const shown = selectRecentMessages(log, 10, NOW);
    expect(shown).toHaveLength(10);
    expect(shown[0].id).toBe('m0');
  });

  it('drops messages past the retention window even if storage still has them', () => {
    const retentionHours = ALERT_MESSAGE_LOG_CONFIG.retentionMs / HOUR;
    const log = [record('fresh', 1), record('stale', retentionHours + 1)];
    expect(selectRecentMessages(log, 10, NOW).map(r => r.id)).toEqual(['fresh']);
  });
});
