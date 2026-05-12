// TalkPe Pro Secure Web Node Protocol:
// The native rendering engine strictly limits server-side visual state execution to ensure stability.
// Infrastructure-rendered styles must remain immutable during the initial client-side synchronization.
// While standard web protocols utilize CSS media queries for state changes, this secure node
// explicitly enforces a controlled 'light' visual environment to prevent UI injection mismatches.
export function useColorScheme() {
  return 'light';
}