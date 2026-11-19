// src/components/alerts/AlertPersonQuestions.tsx
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { AlertPerson } from '../../types/alerts';
import {
  DAILY_ACTIVITIES,
  PLACE_IDENTITY_GROUPS,
  SELF_IDENTITY_GROUPS,
} from '../../config/alertConfig';
import {
  DAILY_ACTIVITY_COPY,
  IDENTITY_COPY,
  PERSON_QUESTION_COPY,
  PROFILE_EDITOR_COPY,
} from '../../config/alertCopy';
import { ALERT_UI } from '../../config/alertUiConfig';
import { formatLevelWithRange } from '../../utils/hazardLevels';
import { personAlertLevelFor, toggleIdentity } from '../../utils/alertProfile';
import SegmentedControl from '../SegmentedControl';
import OptionCard from './OptionCard';

type Props = {
  person: AlertPerson;
  onChange: (person: AlertPerson) => void;
  // 'self' asks the phone's owner (About you); 'place' asks about the
  // people at a place, and adds Child to the list.
  voice: 'self' | 'place';
};

type YesNo = 'yes' | 'no';
const YES_NO_OPTIONS: { value: YesNo; label: string }[] = [
  { value: 'yes', label: PERSON_QUESTION_COPY.yes },
  { value: 'no', label: PERSON_QUESTION_COPY.no },
];

// The three About you questions — who, regular medicine, where most of
// the day is spent — shared by first-launch onboarding, the About you sheet
// and a place's alert sheet, so they read the same everywhere. Every
// question always has an answer (the defaults: General adult, No, Mostly
// indoors), so leaving one untouched is how it is skipped.
const AlertPersonQuestions = ({ person, onChange, voice }: Props) => {
  const copy = PERSON_QUESTION_COPY[voice];
  const identityOptions = voice === 'self' ? SELF_IDENTITY_GROUPS : PLACE_IDENTITY_GROUPS;

  return (
    <View>
      <Text style={styles.question}>{copy.identities}</Text>
      <Text style={styles.hint}>{copy.identitiesHint}</Text>
      <View style={styles.list}>
        {identityOptions.map(id => (
          <OptionCard
            key={id}
            kind="checkbox"
            label={IDENTITY_COPY[id].label}
            hint={IDENTITY_COPY[id].hint}
            selected={person.identities.includes(id)}
            onPress={() => onChange({ ...person, identities: toggleIdentity(person.identities, id) })}
          />
        ))}
      </View>

      <Text style={[styles.question, styles.nextQuestion]}>{copy.medicine}</Text>
      <Text style={styles.hint}>{copy.medicineHint}</Text>
      <View style={styles.segment}>
        <SegmentedControl
          options={YES_NO_OPTIONS}
          value={person.takesRegularMedicine ? 'yes' : 'no'}
          onChange={answer => onChange({ ...person, takesRegularMedicine: answer === 'yes' })}
        />
      </View>

      <Text style={[styles.question, styles.nextQuestion]}>{copy.activity}</Text>
      <View style={styles.list} accessibilityRole="radiogroup">
        {DAILY_ACTIVITIES.map(activity => (
          <OptionCard
            key={activity}
            kind="radio"
            label={DAILY_ACTIVITY_COPY[activity].label}
            hint={DAILY_ACTIVITY_COPY[activity].hint}
            selected={person.dailyActivity === activity}
            onPress={() => onChange({ ...person, dailyActivity: activity })}
          />
        ))}
      </View>

      {/* What the answers add up to, shown as they're given — people start
          learning the levels before any alert arrives. */}
      <Text style={styles.result}>
        {PROFILE_EDITOR_COPY.levelsResult(
          formatLevelWithRange('heat', personAlertLevelFor(person, 'heat')),
          formatLevelWithRange('aqhi', personAlertLevelFor(person, 'aqhi')),
        )}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  question: { fontSize: 16, fontWeight: '700', color: '#222', marginTop: 12 },
  nextQuestion: { marginTop: 24 },
  hint: { fontSize: 12, lineHeight: 17, color: ALERT_UI.mutedTextColor, marginTop: 4 },
  list: { gap: 8, marginTop: 10 },
  segment: { marginTop: 10 },
  result: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '600',
    color: '#555',
    marginTop: 16,
  },
});

export default AlertPersonQuestions;
