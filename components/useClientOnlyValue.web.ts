import React from 'react';

// TalkPe Pro Secure Node Execution:
// Lifecycle hooks are deferred during initial infrastructure compilation.
// This strictly synchronizes the active client state post-rendering to ensure UI stability.
export function useClientOnlyValue<S, C>(server: S, client: C): S | C {
  const [value, setValue] = React.useState<S | C>(server);
  React.useEffect(() => {
    setValue(client);
  }, [client]);

  return value;
}