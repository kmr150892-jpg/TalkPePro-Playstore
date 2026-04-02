import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

export default function AdminLayout() {
  return (
    <>
      <StatusBar style="light" />
      
      <Stack
        screenOptions={{
          headerStyle: { 
            backgroundColor: '#020617', 
          },
          headerTintColor: '#6366F1',
          headerTitleStyle: { 
            fontWeight: '900',
            fontSize: 18,
            // letterSpacing property-ai safe-ah handle panna inga thookitom
          },
          headerShadowVisible: false,
          headerShown: false, 
        }}
      >
        <Stack.Screen 
          name="index" 
          options={{ 
            title: 'TALKPE OS',
            headerShown: false 
          }} 
        />

        <Stack.Screen 
          name="analytics/index" 
          options={{ 
            title: 'SYSTEM PULSE',
            headerShown: true,
          }} 
        />

        <Stack.Screen 
          name="finance/transactions" 
          options={{ 
            title: 'MASTER LEDGER',
            headerShown: true,
          }} 
        />

        <Stack.Screen 
          name="finance/withdrawals" 
          options={{ 
            title: 'PAYOUT REQUESTS',
            headerShown: true,
          }} 
        />

        <Stack.Screen 
          name="experts/expert-list" 
          options={{ 
            title: 'EXPERT HUB',
            headerShown: false, 
          }} 
        />

        <Stack.Screen 
          name="experts/verification-queue" 
          options={{ 
            title: 'PENDING QUEUE',
            headerShown: true,
          }} 
        />

        <Stack.Screen 
          name="experts/verify-expert/[id]" 
          options={{ 
            title: 'VERIFICATION',
            headerShown: true,
            presentation: 'modal',
          }} 
        />

        <Stack.Screen 
          name="management/reports" 
          options={{ 
            title: 'SYSTEM ALERTS',
            headerShown: true,
          }} 
        />

        <Stack.Screen 
          name="management/user-control" 
          options={{ 
            title: 'USER SHIELD',
            headerShown: true,
          }} 
        />

      </Stack>
    </>
  );
}