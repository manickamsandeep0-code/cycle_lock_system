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
      </Stack>
    </>
  );
}
