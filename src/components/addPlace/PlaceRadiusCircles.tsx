// src/components/addPlace/PlaceRadiusCircles.tsx
import React from 'react';
import { Circle } from 'react-native-maps';
import { EXPOSURE_IO_CONFIG } from '../../config/exposureIoConfig';
import { PLACE_LABEL_CONFIG } from '../../config/placeLabelConfig';
import { BookmarkEntry } from '../../types/bookmark';
import { PlaceCircle } from '../../utils/placeOverlap';

type Props = {
  candidate: PlaceCircle;
  otherPlaces: readonly BookmarkEntry[];
  conflictingIds: ReadonlySet<string>;
};

// The circle being placed, plus the user's existing places faintly behind
// it — seeing them is what lets someone shrink a Home circle away from a
// nearby Office. Rendered as MapView children.
const PlaceRadiusCircles: React.FC<Props> = ({ candidate, otherPlaces, conflictingIds }) => {
  const { circleFillOpacityHex, otherPlaceFillOpacityHex, conflictStrokeColor } =
    PLACE_LABEL_CONFIG;
  const candidateColor = EXPOSURE_IO_CONFIG[candidate.category].color;

  return (
    <>
      {otherPlaces.map(place => {
        const color = EXPOSURE_IO_CONFIG[place.category].color;
        const conflicting = conflictingIds.has(place.id);
        return (
          <Circle
            key={place.id}
            center={{ latitude: place.latitude, longitude: place.longitude }}
            radius={place.radiusMeters}
            strokeColor={conflicting ? conflictStrokeColor : color}
            strokeWidth={conflicting ? 2 : 1}
            fillColor={`${color}${otherPlaceFillOpacityHex}`}
          />
        );
      })}
      <Circle
        center={{ latitude: candidate.latitude, longitude: candidate.longitude }}
        radius={candidate.radiusMeters}
        strokeColor={candidateColor}
        strokeWidth={2}
        fillColor={`${candidateColor}${circleFillOpacityHex}`}
      />
    </>
  );
};

export default PlaceRadiusCircles;
