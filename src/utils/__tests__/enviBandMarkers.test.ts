import { enviBandMarkers } from '../enviBandMarkers';

describe('enviBandMarkers', () => {
  it('has no arrows without a level', () => {
    expect(enviBandMarkers(null, 4)).toEqual([]);
  });

  it('centres "Now" alone in the middle levels', () => {
    expect(enviBandMarkers(3, null)).toEqual([{ kind: 'now', level: 3, align: 'center' }]);
  });

  it('keeps labels inside the card at levels 1 and 5', () => {
    expect(enviBandMarkers(1, null)[0].align).toBe('cellStart');
    expect(enviBandMarkers(5, null)[0].align).toBe('cellEnd');
    expect(enviBandMarkers(2, 5)[1]).toEqual({ kind: 'peak', level: 5, align: 'cellEnd' });
  });

  it('shows the peak only when it is above now', () => {
    expect(enviBandMarkers(3, 3)).toHaveLength(1);
    expect(enviBandMarkers(3, 2)).toHaveLength(1);
    expect(enviBandMarkers(2, 4)).toEqual([
      { kind: 'now', level: 2, align: 'center' },
      { kind: 'peak', level: 4, align: 'center' },
    ]);
  });

  it('pushes next-door labels apart', () => {
    expect(enviBandMarkers(2, 3)).toEqual([
      { kind: 'now', level: 2, align: 'endAtArrow' },
      { kind: 'peak', level: 3, align: 'startAtArrow' },
    ]);
    // The card-edge rule still wins at the ends.
    expect(enviBandMarkers(1, 2).map(m => m.align)).toEqual(['cellStart', 'startAtArrow']);
    expect(enviBandMarkers(4, 5).map(m => m.align)).toEqual(['endAtArrow', 'cellEnd']);
  });
});
