import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { appConfig } from '@/app.config';
import { useTenantFlag } from '@/lib/tenant-surface';
import type { ComponentType, ReactNode } from 'react';

const { backgroundHex, primaryHex, headerTintHex } = appConfig.theme;

const TabNavigator = Tabs as unknown as ComponentType<{
  children?: ReactNode;
  screenOptions?: Record<string, unknown>;
}>;

type TabIconName = keyof typeof Ionicons.glyphMap;

function tabIcon(name: TabIconName) {
  return ({ color, size }: { color: string; size: number }) => (
    <Ionicons name={name} size={size} color={color} />
  );
}

export default function TabsLayout() {
  const nativeChat = useTenantFlag('feature.dating_native_chat', false);
  const nativePremium = useTenantFlag('feature.dating_native_premium', false);

  return (
    <TabNavigator
      screenOptions={{
        headerStyle: { backgroundColor: backgroundHex },
        headerTintColor: headerTintHex,
        tabBarStyle: { backgroundColor: backgroundHex, borderTopColor: 'rgba(255,255,255,0.1)' },
        tabBarActiveTintColor: primaryHex,
        tabBarInactiveTintColor: 'rgba(255,255,255,0.5)',
      }}
    >
      <Tabs.Screen
        name="index"
        options={{ title: 'Discover', tabBarLabel: 'Discover', tabBarIcon: tabIcon('flame') }}
      />
      <Tabs.Screen
        name="likes"
        options={{ title: 'Likes', tabBarLabel: 'Likes', tabBarIcon: tabIcon('heart') }}
      />
      <Tabs.Screen
        name="matches"
        options={{ title: 'Matches', tabBarLabel: 'Matches', tabBarIcon: tabIcon('people') }}
      />
      <Tabs.Screen
        name="messages"
        options={{
          title: 'Messages',
          tabBarLabel: 'Chat',
          href: nativeChat ? undefined : null,
          tabBarIcon: tabIcon('chatbubbles'),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{ title: 'Profile', tabBarLabel: 'Profile', tabBarIcon: tabIcon('person') }}
      />
      <Tabs.Screen
        name="premium"
        options={{
          title: 'Premium',
          tabBarLabel: 'Plus',
          href: nativePremium ? undefined : null,
          tabBarIcon: tabIcon('star'),
        }}
      />
      <Tabs.Screen name="messages/[threadId]" options={{ href: null, title: 'Chat' }} />
    </TabNavigator>
  );
}
