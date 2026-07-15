import React, { useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ScreenHeader } from '@components/ScreenHeader';
import { Button } from '@components/Button';
import { Input } from '@components/Input';
import { Icon } from '@components/Icon';
import { colors } from '@theme/colors';
import { typography } from '@theme/typography';
import { useSession } from '@store/session';

interface Option {
  /**
   * Either a typographic glyph (rendered in serif) or a name from our
   * SVG `<Icon>` set. SVG is preferred for anything iOS doesn't render
   * cleanly as a font character (people silhouette, pin, globe, etc.).
   */
  icon: string | { svg: 'inperson' | 'video' | 'pin' | 'sun' | 'shield' | 'bell' };
  title: string;
  detail?: string;
}
interface Step {
  label: string;
  question: { lead: string; italic: string; trail?: string };
  help: string;
  grid?: boolean;
  withInput?: boolean;
  options: Option[];
}

const steps: Step[] = [
  {
    label: 'Étape 1/4',
    question: {
      lead: 'Que cherchez-vous,',
      italic: 'à cet instant',
      trail: ' ?',
    },
    help: 'Soyez intuitif·ve. On affine ensuite ensemble.',
    options: [
      { icon: '❀', title: 'Un soin ou un accompagnement', detail: 'Pour moi-même' },
      { icon: '❄', title: 'Un soin pour un proche', detail: "Quelqu'un qui traverse une période difficile" },
      { icon: '✦', title: 'Une retraite ou un événement', detail: 'Souffler, me ressourcer' },
      { icon: '☉', title: 'Une communauté, des échanges', detail: "Me rapprocher d'autres chercheurs" },
      { icon: '◑', title: 'Je découvre, je me renseigne', detail: 'Pas pressé·e, je veux comprendre' },
    ],
  },
  {
    label: 'Étape 2/4',
    question: {
      lead: 'Vers quelles',
      italic: 'pratiques',
      trail: ' votre cœur penche-t-il ?',
    },
    help: 'Plusieurs choix possibles. Et vous pourrez toujours explorer.',
    grid: true,
    options: [
      { icon: '✦', title: 'Magnétisme' },
      { icon: '❍', title: 'Reiki' },
      { icon: '◊', title: 'Chamanisme' },
      { icon: '◐', title: 'Hypnose' },
      { icon: '☉', title: 'Méditation' },
      { icon: '✺', title: 'Clairvoyance' },
      { icon: '◯', title: 'Bain sonore' },
      { icon: '❀', title: 'Soin énergétique' },
      { icon: '❖', title: 'Purification' },
      { icon: '⌇', title: 'Massage thérap.' },
    ],
  },
  {
    label: 'Étape 3/4',
    question: {
      lead: 'Présence physique ou',
      italic: 'à distance',
      trail: ' ?',
    },
    help: 'Les soins énergétiques fonctionnent dans les deux modes.',
    options: [
      { icon: { svg: 'inperson' }, title: 'En présentiel', detail: 'Je préfère rencontrer mon praticien' },
      { icon: { svg: 'video' }, title: 'En visio / à distance', detail: 'Plus pratique, je reste chez moi' },
      { icon: '✦', title: "Peu importe, le lien d'abord", detail: 'Je suis ouvert·e aux deux' },
    ],
  },
  {
    label: 'Étape 4/4',
    question: { lead: 'Où vous trouvez-', italic: 'vous', trail: ' ?' },
    help: 'Pour vous suggérer des praticiens proches — et toujours quelques visios.',
    withInput: true,
    options: [
      { icon: { svg: 'pin' }, title: 'Annecy, Haute-Savoie', detail: '74000 · à 12km de vous' },
      { icon: '☉', title: 'Lyon', detail: 'Élargir à 50km' },
      { icon: '✺', title: 'Paris', detail: 'Sélectionner manuellement' },
    ],
  },
];

export default function Quiz() {
  const router = useRouter();
  const params = useLocalSearchParams<{ step?: string }>();
  const insets = useSafeAreaInsets();
  const stepIndex = Math.max(0, Math.min(3, parseInt(params.step ?? '0', 10)));
  const step = steps[stepIndex];
  const quizAnswers = useSession((s) => s.quizAnswers);
  const setQuizAnswer = useSession((s) => s.setQuizAnswer);
  const [selected, setSelected] = useState<number>(() => quizAnswers[stepIndex] ?? 0);

  const next = () => {
    setQuizAnswer(stepIndex, selected);
    if (stepIndex === steps.length - 1) {
      router.replace('/(tabs)' as any);
    } else {
      router.push(`/onboarding/quiz?step=${stepIndex + 1}` as any);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.pearl }}>
      <ScreenHeader
        transparent
        rightAction={
          <View style={styles.confidential}>
            <Icon name="shield" size={14} color={colors.muted} />
            <Text style={styles.confidentialTxt}>Confidentiel</Text>
          </View>
        }
      />
      <ScrollView
        contentContainerStyle={{ paddingBottom: insets.bottom + 32 }}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.head}>
          <View style={styles.progress}>
            <View
              style={[styles.progressFill, { width: `${((stepIndex + 1) / steps.length) * 100}%` }]}
            />
          </View>
          <Text style={styles.stepLabel}>{step.label}</Text>
          <Text style={styles.q}>
            {step.question.lead}{' '}
            <Text style={styles.qItalic}>{step.question.italic}</Text>
            {step.question.trail}
          </Text>
          <Text style={styles.help}>{step.help}</Text>
        </View>

        <View style={{ paddingHorizontal: 24 }}>
          {step.withInput ? (
            <Input
              leftIcon={<Icon name="search" size={18} color={colors.muted} />}
              value="Annecy"
              placeholder="Saisir une ville…"
              containerStyle={{ marginBottom: 18 }}
            />
          ) : null}

          {step.grid ? (
            <View style={styles.grid}>
              {step.options.map((o, i) => (
                <Option
                  key={i}
                  option={o}
                  grid
                  selected={i === selected}
                  onPress={() => setSelected(i)}
                />
              ))}
            </View>
          ) : (
            <View style={{ gap: 10 }}>
              {step.options.map((o, i) => (
                <Option
                  key={i}
                  option={o}
                  selected={i === selected}
                  onPress={() => setSelected(i)}
                />
              ))}
            </View>
          )}
        </View>

        <View style={{ padding: 24, paddingTop: 28 }}>
          <Button
            label={stepIndex === steps.length - 1 ? 'Voir mes praticiens' : 'Continuer'}
            onPress={next}
          />
        </View>
      </ScrollView>
    </View>
  );
}

function Option({
  option,
  selected,
  grid,
  onPress,
}: {
  option: Option;
  selected: boolean;
  grid?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.opt,
        grid && styles.optGrid,
        selected && styles.optSelected,
      ]}
    >
      <View style={[styles.optIcon, grid && { marginBottom: 4 }]}>
        {typeof option.icon === 'string' ? (
          <Text style={styles.optGlyph}>{option.icon}</Text>
        ) : (
          <Icon name={option.icon.svg} size={20} color={colors.ink} />
        )}
      </View>
      <View style={{ flex: 1, alignItems: grid ? 'center' : 'flex-start' }}>
        <Text style={[styles.optTitle, grid && { textAlign: 'center' }]}>
          {option.title}
        </Text>
        {option.detail && !grid ? (
          <Text style={styles.optDetail}>{option.detail}</Text>
        ) : null}
      </View>
      {!grid ? (
        <View
          style={[
            styles.optCheck,
            selected && styles.optCheckSelected,
          ]}
        >
          {selected ? <Icon name="check" size={12} color="#fff" /> : null}
        </View>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  confidential: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 8,
  },
  confidentialTxt: { ...typography.small, fontSize: 12 },
  head: { padding: 24, paddingTop: 0 },
  progress: {
    height: 3,
    backgroundColor: 'rgba(45,37,64,0.08)',
    borderRadius: 2,
    overflow: 'hidden',
    marginBottom: 24,
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.violet2,
    borderRadius: 2,
  },
  stepLabel: { ...typography.eyebrow, marginBottom: 12 },
  q: {
    ...typography.h2,
    fontFamily: 'CormorantGaramond_400Regular',
    fontSize: 28,
    lineHeight: 33,
    marginBottom: 8,
  },
  qItalic: {
    fontFamily: 'CormorantGaramond_400Regular_Italic',
    color: colors.violet2,
  },
  help: { ...typography.small, fontSize: 14, lineHeight: 21 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  opt: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingHorizontal: 18,
    paddingVertical: 16,
    backgroundColor: '#fff',
    borderWidth: 1.5,
    borderColor: colors.line,
    borderRadius: 18,
  },
  optGrid: {
    width: '48%',
    flexDirection: 'column',
    paddingVertical: 18,
    paddingHorizontal: 12,
    gap: 8,
  },
  optSelected: {
    borderColor: colors.violet2,
    backgroundColor: '#FBF7FF',
  },
  optIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: colors.mist,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optGlyph: {
    // Intentionally no fontFamily — Cormorant doesn't have glyphs for
    // dingbats (❄ ❀ ❖ ☉ ✺ ⌇ etc.), so we let iOS/Android fall back to the
    // system font which renders them properly.
    fontSize: 18,
    color: colors.ink,
  },
  optTitle: {
    ...typography.bodyMedium,
    fontSize: 15,
    marginBottom: 2,
  },
  optDetail: {
    ...typography.tiny,
    fontSize: 12,
  },
  optCheck: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.5,
    borderColor: '#D8D2C4',
    alignItems: 'center',
    justifyContent: 'center',
  },
  optCheckSelected: {
    backgroundColor: colors.ink,
    borderColor: colors.ink,
  },
});
