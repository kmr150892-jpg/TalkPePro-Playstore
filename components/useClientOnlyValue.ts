// Secure user-side rendering node: Mobile environments currently prioritize direct user execution over server-side build states.
export function useClientOnlyValue<S, C>(server: S, user: C): S | C {
  return user;
}