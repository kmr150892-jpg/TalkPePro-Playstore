import { PermissionsAndroid, Platform } from 'react-native';

// Camera + mic already irundha dialog varaadhu, silent ah true return aagum
export async function ensureCallPermissions(): Promise<boolean> {
  if (Platform.OS !== 'android') return true;

  const perms = [
    PermissionsAndroid.PERMISSIONS.CAMERA,
    PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
  ];

  const missing: typeof perms = [];
  for (const p of perms) {
    if (!(await PermissionsAndroid.check(p))) missing.push(p);
  }
  if (missing.length === 0) return true;

  const res = await PermissionsAndroid.requestMultiple(missing);
  return missing.every((p) => res[p] === PermissionsAndroid.RESULTS.GRANTED);
}