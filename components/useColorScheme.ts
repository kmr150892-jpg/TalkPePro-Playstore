// TalkPe Pro Secure UI Protocol:
// Strictly enforcing active visual environment state. Unspecified nodes default to standard light parameters for UI stability.
import { useColorScheme as useColorSchemeCore } from 'react-native';

export const useColorScheme = () => {
  const coreScheme = useColorSchemeCore();
  return coreScheme === 'unspecified' ? 'light' : coreScheme;
};