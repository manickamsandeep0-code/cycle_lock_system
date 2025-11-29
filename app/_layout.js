import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

export default function Layout() {
  return (
    <>
      <StatusBar style="dark" />
      <Stack>
        <Stack.Screen 
          name="index" 
          options={{ headerShown: false }} 
        />
        <Stack.Screen 
          name="login" 
          options={{ headerShown: false }} 
        />
        <Stack.Screen 
          name="register" 
          options={{ 
            title: 'Register',
            headerBackTitle: 'Back'
          }} 
        />
        <Stack.Screen 
          name="map" 
          options={{ headerShown: false }} 
        />
        <Stack.Screen 
          name="rent-cycle" 
          options={{ 
            title: 'Rent Cycle',
            presentation: 'modal'
          }} 
        />
        <Stack.Screen 
          name="owner/dashboard" 
          options={{ headerShown: false }} 
        />
        <Stack.Screen 
          name="owner/register-lock" 
          options={{ 
            title: 'Register Lock',
            presentation: 'modal'
          }} 
        />
        <Stack.Screen 
          name="owner/set-availability" 
          options={{ 
            title: 'Set Availability',
            presentation: 'modal'
          }} 
        />
        <Stack.Screen 
          name="owner/cycle-map" 
          options={{ 
            title: 'Cycle Location',
            headerShown: false
          }} 
        />
      </Stack>
    </>
  );
}
