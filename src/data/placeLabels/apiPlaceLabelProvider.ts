import { deletePlaceLabel, upsertPlaceLabel } from '../../services/exposureApi';
import { PlaceLabelDataProvider } from './types';

export const apiPlaceLabelProvider: PlaceLabelDataProvider = {
  upsert: upsertPlaceLabel,
  remove: deletePlaceLabel,
};
