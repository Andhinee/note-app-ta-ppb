import { Stack } from "expo-router";
import AuthWrapper from "@/components/AuthWrapper";

export default function RootLayout() {
  return (
    <AuthWrapper>
      <Stack>
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="signup" options={{ headerShown: false }} />
        <Stack.Screen name="welcome" options={{ headerShown: false }} />
        <Stack.Screen name="beranda" options={{ headerShown: false }} />
        <Stack.Screen name="create" options={{ headerShown: false }} />
        <Stack.Screen name="editNote" options={{ headerShown: false }} />
        <Stack.Screen name="setting" options={{ headerShown: false }} />
        <Stack.Screen name="profil" options={{ headerShown: false }} />
      </Stack>
    </AuthWrapper>
  );
}
