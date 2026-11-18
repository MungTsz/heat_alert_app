import { pickDefaultMapLayer } from '../defaultMapLayer';
import { DEFAULT_MAP_LAYER_CONFIG, MAP_LAYER_ORDER } from '../../config/mapLayerConfig';

describe('pickDefaultMapLayer', () => {
  it('always opens on the Environmental Index layer', () => {
    expect(pickDefaultMapLayer()).toBe('envi');
    expect(DEFAULT_MAP_LAYER_CONFIG.startLayer).toBe('envi');
  });

  it('lists the index first in the picker, with heat index and AQHI as details', () => {
    expect(MAP_LAYER_ORDER.primary).toBe(pickDefaultMapLayer());
    expect(MAP_LAYER_ORDER.details).toEqual(['heat', 'aqhi']);
  });
});
