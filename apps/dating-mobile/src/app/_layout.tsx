import '../../global.css';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { TRPCProvider } from '@/lib/trpc';
import { appConfig } from '@/app.config';
import type { ComponentType, ReactNode } from 'react';

const StackNavigator = Stack as unknown as ComponentType<{
  children?: ReactNode;
  screenOptions?: {
    headerStyle?: { backgroundColor?: string };
    headerTintColor?: string;
    contentStyle?: { backgroundColor?: string };
  };
}>;

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
    <SafeAreaProvider>
      <TRPCProvider>
        <StatusBar style="light" />
        <StackNavigator
          screenOptions={{
            headerStyle: { backgroundColor: appConfig.theme.backgroundHex },
            headerTintColor: appConfig.theme.headerTintHex,
            contentStyle: { backgroundColor: appConfig.theme.backgroundHex },
          }}
        >
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="login" options={{ title: 'Sign in', presentation: 'modal' }} />
          <Stack.Screen name="onboarding" options={{ title: 'Setup', headerShown: true }} />
        </StackNavigator>
      </TRPCProvider>
    </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
