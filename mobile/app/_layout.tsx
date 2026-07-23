import 'react-native-gesture-handler';
import React, { useEffect } from 'react';
import { View } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { StripeProvider } from '@stripe/stripe-react-native';
import { StatusBar } from 'expo-status-bar';
import {
  useFonts,
  CormorantGaramond_300Light,
  CormorantGaramond_300Light_Italic,
  CormorantGaramond_400Regular,
  CormorantGaramond_400Regular_Italic,
  CormorantGaramond_500Medium,
  CormorantGaramond_500Medium_Italic,
  CormorantGaramond_600SemiBold,
} from '@expo-google-fonts/cormorant-garamond';
import {
  Outfit_300Light,
  Outfit_400Regular,
  Outfit_500Medium,
  Outfit_600SemiBold,
  Outfit_700Bold,
} from '@expo-google-fonts/outfit';
import { colors } from '@theme/colors';
import { setUnauthorizedHandler } from '@data/api/client';
import { useSession } from '@store/session';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

const STRIPE_PUBLISHABLE_KEY = process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? '';

export default function RootLayout() {
  const router = useRouter();

  // On any authenticated 401 (expired/invalid JWT), sign out and send the user
  // to login — instead of leaking "Token invalide ou expiré" into whatever
  // screen fired the request (e.g. the payment sheet).
  useEffect(() => {
    setUnauthorizedHandler(() => {
      useSession.getState().signOut();
      router.replace('/onboarding/auth?mode=login' as any);
    });
    return () => setUnauthorizedHandler(null);
  }, [router]);

  const [fontsLoaded, fontError] = useFonts({
    CormorantGaramond_300Light,
    CormorantGaramond_300Light_Italic,
    CormorantGaramond_400Regular,
    CormorantGaramond_400Regular_Italic,
    CormorantGaramond_500Medium,
    CormorantGaramond_500Medium_Italic,
    CormorantGaramond_600SemiBold,
    Outfit_300Light,
    Outfit_400Regular,
    Outfit_500Medium,
    Outfit_600SemiBold,
    Outfit_700Bold,
  });

  if (!fontsLoaded && !fontError) {
    return <View style={{ flex: 1, backgroundColor: colors.pearl }} />;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: colors.pearl }}>
      <SafeAreaProvider>
        <StripeProvider publishableKey={STRIPE_PUBLISHABLE_KEY} urlScheme="guerienergies">
          <QueryClientProvider client={queryClient}>
            <StatusBar style="dark" />
            <Stack
              screenOptions={{
                headerShown: false,
                contentStyle: { backgroundColor: colors.pearl },
                animation: 'slide_from_right',
              }}
            >
              <Stack.Screen name="index" options={{ animation: 'fade' }} />
              <Stack.Screen name="onboarding/index" options={{ animation: 'fade' }} />
              <Stack.Screen name="onboarding/role" />
              <Stack.Screen name="onboarding/auth" />
              <Stack.Screen name="onboarding/praticien-profil" />
              <Stack.Screen name="onboarding/praticien-documents" />
              <Stack.Screen name="onboarding/quiz" />
              <Stack.Screen name="(tabs)" options={{ animation: 'fade' }} />
              <Stack.Screen
                name="praticien/[id]"
                options={{ animation: 'slide_from_bottom' }}
              />
              <Stack.Screen name="domain/[slug]" />
              <Stack.Screen name="booking/slot" />
              <Stack.Screen name="booking/payment" />
              <Stack.Screen name="booking/confirmation" options={{ animation: 'fade' }} />
              <Stack.Screen name="chat/[id]" />
              <Stack.Screen name="event/[id]" />
              <Stack.Screen name="exchange/index" />
              <Stack.Screen name="exchange/mine" />
              <Stack.Screen name="exchange/[id]" />
              <Stack.Screen name="exchange/create" options={{ presentation: 'modal' }} />
              <Stack.Screen name="payment-history" />
              <Stack.Screen name="refund-request" options={{ presentation: 'modal', title: 'Remboursement' }} />
              <Stack.Screen name="cercles/index" />
              <Stack.Screen name="cercles/[id]" />
              <Stack.Screen name="cercles/create" options={{ presentation: 'modal' }} />
              <Stack.Screen name="blog/index" />
              <Stack.Screen name="blog/[slug]" />
              <Stack.Screen name="review" options={{ presentation: 'modal' }} />
              <Stack.Screen name="report" options={{ presentation: 'modal' }} />
              <Stack.Screen name="report-client" options={{ presentation: 'modal' }} />
              <Stack.Screen name="favorites" />
              <Stack.Screen name="rendez-vous" />
              <Stack.Screen name="notification-settings" />
              <Stack.Screen name="founder" />
              <Stack.Screen name="dashboard" />
              <Stack.Screen name="praticien-messages/index" />
              <Stack.Screen name="praticien-messages/[id]" />
              <Stack.Screen name="peer-messages/index" />
              <Stack.Screen name="peer-messages/[id]" />
              <Stack.Screen name="peer-messages/new" options={{ presentation: 'modal' }} />
              <Stack.Screen name="subscription" />
            </Stack>
          </QueryClientProvider>
        </StripeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
