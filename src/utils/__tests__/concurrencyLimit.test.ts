import { runWithConcurrencyLimit } from '../concurrencyLimit';

describe('runWithConcurrencyLimit', () => {
  it('never runs more than `limit` workers at once', async () => {
    const items = Array.from({ length: 10 }, (_, i) => i);
    let inFlight = 0;
    let maxInFlight = 0;

    await runWithConcurrencyLimit(items, 3, async () => {
      inFlight++;
      maxInFlight = Math.max(maxInFlight, inFlight);
      await new Promise<void>(resolve => setTimeout(resolve, 5));
      inFlight--;
    });

    expect(maxInFlight).toBeLessThanOrEqual(3);
  });

  it('processes every item exactly once', async () => {
    const items = Array.from({ length: 10 }, (_, i) => i);
    const seen: number[] = [];

    await runWithConcurrencyLimit(items, 4, async item => {
      seen.push(item);
    });

    expect(seen.sort((a, b) => a - b)).toEqual(items);
  });

  it('settles all items even when some workers reject', async () => {
    const items = Array.from({ length: 6 }, (_, i) => i);
    const processed: number[] = [];

    await expect(
      runWithConcurrencyLimit(items, 2, async item => {
        processed.push(item);
        if (item % 2 === 0) throw new Error(`fail on ${item}`);
      }),
    ).resolves.toBeUndefined();

    expect(processed.sort((a, b) => a - b)).toEqual(items);
  });
});
