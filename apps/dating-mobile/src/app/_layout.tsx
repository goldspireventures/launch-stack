import '../../global.css';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { TRPCProvider } from '@/lib/trpc';
import type { ComponentType, ReactNode } from 'react';

/** Drizzle's optional peer pulls `@types/react@19` while Expo targets React 18; avoid cross-version `ComponentProps`. */
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
    <SafeAreaProvider>
      <TRPCProvider>
        <StatusBar style="light" />
        <StackNavigator
          screenOptions={{
            headerStyle: { backgroundColor: '#0B0B0F' },
            headerTintColor: '#FFFFFF',
            contentStyle: { backgroundColor: '#0B0B0F' },
          }}
        >
          <Stack.Screen name="index" options={{ title: 'Heartline' }} />
          <Stack.Screen name="matches" options={{ title: 'Matches' }} />
          <Stack.Screen name="profile" options={{ title: 'Profile' }} />
        </StackNavigator>
      </TRPCProvider>
    </SafeAreaProvider>
  );
}
