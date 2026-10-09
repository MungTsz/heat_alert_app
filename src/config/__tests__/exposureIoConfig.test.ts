import { EXPOSURE_IO_CONFIG, normalizeExposureIo } from '../exposureIoConfig';
import { EXPOSURE_IO_TYPES } from '../../types/exposure';

describe('normalizeExposureIo', () => {
  it('passes known backend io types through unchanged', () => {
    for (const io of EXPOSURE_IO_TYPES) expect(normalizeExposureIo(io)).toBe(io);
  });

  it('maps legacy "Indoor" to Other Indoor', () => {
    expect(normalizeExposureIo('Indoor')).toBe('Other Indoor');
  });

  it('falls back by name for unknown io types', () => {
    expect(normalizeExposureIo('Office Indoor')).toBe('Other Indoor');
    expect(normalizeExposureIo('Transit')).toBe('Outdoor');
  });
});

describe('EXPOSURE_IO_CONFIG', () => {
  it('gives every io type its own distinct color', () => {
    const colors = EXPOSURE_IO_TYPES.map(io => EXPOSURE_IO_CONFIG[io].color.toLowerCase());
    expect(new Set(colors).size).toBe(colors.length);
  });
});
