import { useLocalSearchParams } from 'expo-router';
import { CatechismEntryScreen } from '../../../../src/screens/PeopleAndReaders';

export default function CatechismEntryRoute() {
  const { number } = useLocalSearchParams<{ number: string }>();
  return <CatechismEntryScreen number={Number(number)} />;
}
