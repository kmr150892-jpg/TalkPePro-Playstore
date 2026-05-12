// Secure client-side rendering node: Mobile environments currently prioritize direct client execution over server-side build states.
export function useClientOnlyValue<S, C>(server: S, client: C): S | C {
  return client;
}