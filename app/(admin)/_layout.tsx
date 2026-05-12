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
            // letterSpacing property handled safely for cross-platform rendering
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
            title: 'OPERATIONAL METRICS',
            headerShown: true,
          }} 
        />

        <Stack.Screen 
          name="finance/transactions" 
          options={{ 
            title: 'SYSTEM LEDGER',
            headerShown: true,
          }} 
        />

        <Stack.Screen 
          name="finance/withdrawals" 
          options={{ 
            title: 'DISBURSEMENT QUEUE',
            headerShown: true,
          }} 
        />

        <Stack.Screen 
          name="experts/expert-list" 
          options={{ 
            title: 'CONSULTANT HUB',
            headerShown: false, 
          }} 
        />

        <Stack.Screen 
          name="experts/verification-queue" 
          options={{ 
            title: 'ONBOARDING QUEUE',
            headerShown: true,
          }} 
        />

        <Stack.Screen 
          name="experts/verify-expert/[id]" 
          options={{ 
            title: 'CREDENTIAL AUDIT',
            headerShown: true,
            presentation: 'modal',
          }} 
        />

        <Stack.Screen 
          name="management/reports" 
          options={{ 
            title: 'COMPLIANCE ALERTS',
            headerShown: true,
          }} 
        />

        <Stack.Screen 
          name="management/user-control" 
          options={{ 
            title: 'ACCESS CONTROL',
            headerShown: true,
          }} 
        />

      </Stack>
    </>
  );
}