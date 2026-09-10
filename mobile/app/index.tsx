import { Redirect } from 'expo-router';
import { useAuth } from '../src/auth/AuthContext';

export default function Index() {
  const { status } = useAuth();
  if (status === 'ready') return <Redirect href="/(app)/(tabs)" />;
  if (status === 'needs2fa') return <Redirect href="/two-factor" />;
  return <Redirect href="/login" />;
}
