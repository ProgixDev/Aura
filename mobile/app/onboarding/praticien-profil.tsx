import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ScreenHeader } from '@components/ScreenHeader';
import { Button } from '@components/Button';
import { Input } from '@components/Input';
import { colors } from '@theme/colors';
import { typography } from '@theme/typography';
import { disciplineRepo } from '@data/repos';
import { usePraticienRegistration } from '@store/praticienRegistration';
import { isValidSiret } from '@utils/siret';

const NIVEAUX = ['Novice', 'Praticien confirmé', 'Expert'];
const MODES = ['présentiel', 'visio uniquement', 'présentiel & visio'];

const schema = z.object({
  siret: z.string()
    .regex(/^\d{14}$/, 'Le SIRET doit contenir exactement 14 chiffres')
    .refine(isValidSiret, 'Numéro de SIRET invalide (échec de la clé de contrôle)'),
  telephone: z.string().min(6, 'Numéro invalide'),
  niveau: z.string().min(1, 'Choisissez votre niveau'),
  specialite: z.string().min(1, 'Choisissez votre spécialité'),
  mode: z.string().min(1, 'Choisissez un mode'),
  tarif: z.string().min(1, 'Tarif requis').regex(/^\d+(\.\d{1,2})?$/, 'Nombre invalide'),
  experience: z.string().min(1, "Années d'expérience requises").regex(/^\d+$/, 'Nombre entier requis'),
  bio: z.string().min(50, '50 caractères minimum'),
});
type FormValues = z.infer<typeof schema>;

function ChipRow({
  options,
  value,
  onChange,
}: {
  options: string[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <View style={styles.chipRow}>
      {options.map((opt) => (
        <Pressable
          key={opt}
          style={[styles.chip, value === opt && styles.chipActive]}
          onPress={() => onChange(opt)}
        >
          <Text style={[styles.chipTxt, value === opt && styles.chipTxtActive]}>{opt}</Text>
        </Pressable>
      ))}
    </View>
  );
}

export default function PraticienProfil() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const draft = usePraticienRegistration((s) => s.draft);
  const patchDraft = usePraticienRegistration((s) => s.patchDraft);
  const { data: disciplines = [] } = useQuery({
    queryKey: ['disciplines'],
    queryFn: disciplineRepo.list,
  });

  const { control, handleSubmit, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      siret: draft.siret ?? '',
      telephone: draft.telephone ?? '',
      niveau: draft.niveau ?? '',
      specialite: draft.specialite ?? '',
      mode: draft.mode ?? '',
      tarif: draft.tarif ? String(draft.tarif) : '',
      experience: draft.experience ? String(draft.experience) : '',
      bio: draft.bio ?? '',
    },
  });

  const submit = (data: FormValues) => {
    patchDraft({
      siret: data.siret,
      telephone: data.telephone,
      niveau: data.niveau,
      specialite: data.specialite,
      mode: data.mode,
      tarif: Number(data.tarif),
      experience: Number(data.experience),
      bio: data.bio,
    });
    router.push('/onboarding/praticien-documents' as any);
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.pearl }}>
      <ScreenHeader transparent />
      <ScrollView
        contentContainerStyle={{ padding: 24, paddingTop: 12, paddingBottom: insets.bottom + 32 }}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.h1}>Votre <Text style={styles.italic}>pratique</Text></Text>
        <Text style={styles.small}>Pour que les chercheurs de soin vous trouvent.</Text>
        <View style={{ height: 24 }} />

        <Controller
          control={control}
          name="siret"
          render={({ field: { onChange, value } }) => (
            <Input label="Numéro de SIRET" value={value} onChangeText={onChange} keyboardType="number-pad" maxLength={14} />
          )}
        />
        {errors.siret && <Text style={styles.error}>{errors.siret.message}</Text>}

        <Controller
          control={control}
          name="telephone"
          render={({ field: { onChange, value } }) => (
            <Input label="Téléphone" value={value} onChangeText={onChange} keyboardType="phone-pad" />
          )}
        />
        {errors.telephone && <Text style={styles.error}>{errors.telephone.message}</Text>}

        <Text style={styles.label}>Niveau</Text>
        <Controller
          control={control}
          name="niveau"
          render={({ field: { onChange, value } }) => (
            <ChipRow options={NIVEAUX} value={value} onChange={onChange} />
          )}
        />
        {errors.niveau && <Text style={styles.error}>{errors.niveau.message}</Text>}

        <Text style={styles.label}>Spécialité</Text>
        <Controller
          control={control}
          name="specialite"
          render={({ field: { onChange, value } }) => (
            <ChipRow options={disciplines.map((d) => d.name)} value={value} onChange={onChange} />
          )}
        />
        {errors.specialite && <Text style={styles.error}>{errors.specialite.message}</Text>}

        <Text style={styles.label}>Mode de séance</Text>
        <Controller
          control={control}
          name="mode"
          render={({ field: { onChange, value } }) => (
            <ChipRow options={MODES} value={value} onChange={onChange} />
          )}
        />
        {errors.mode && <Text style={styles.error}>{errors.mode.message}</Text>}

        <View style={{ height: 8 }} />
        <Controller
          control={control}
          name="tarif"
          render={({ field: { onChange, value } }) => (
            <Input label="Tarif par séance (€)" value={value} onChangeText={onChange} keyboardType="decimal-pad" />
          )}
        />
        {errors.tarif && <Text style={styles.error}>{errors.tarif.message}</Text>}

        <Controller
          control={control}
          name="experience"
          render={({ field: { onChange, value } }) => (
            <Input label="Années d'expérience" value={value} onChangeText={onChange} keyboardType="number-pad" />
          )}
        />
        {errors.experience && <Text style={styles.error}>{errors.experience.message}</Text>}

        <Controller
          control={control}
          name="bio"
          render={({ field: { onChange, value } }) => (
            <Input label="Bio (50 caractères minimum)" value={value} onChangeText={onChange} multiline />
          )}
        />
        {errors.bio && <Text style={styles.error}>{errors.bio.message}</Text>}

        <View style={{ height: 12 }} />
        <Button label="Continuer" onPress={handleSubmit(submit)} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  h1: { ...typography.h1, marginBottom: 6 },
  italic: { fontFamily: 'CormorantGaramond_400Regular_Italic', color: colors.violet2 },
  small: { ...typography.small },
  label: {
    ...typography.tiny,
    color: colors.muted,
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginTop: 6,
    marginBottom: 8,
  },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 4 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 999,
    backgroundColor: colors.mist,
  },
  chipActive: { backgroundColor: colors.ink },
  chipTxt: { ...typography.small, fontSize: 13, color: colors.ink },
  chipTxtActive: { color: '#fff', fontFamily: 'Outfit_500Medium' },
  error: {
    ...typography.tiny,
    color: colors.danger,
    marginTop: -10,
    marginBottom: 10,
  },
});
