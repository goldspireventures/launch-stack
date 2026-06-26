import * as React from 'react';

type PersonaSession = {
  version: number;
  reload: () => void;
};

const PersonaSessionContext = React.createContext<PersonaSession>({
  version: 0,
  reload: () => undefined,
});

export function PersonaSessionProvider({ children }: { children: React.ReactNode }) {
  const [version, setVersion] = React.useState(0);
  const reload = React.useCallback(() => {
    setVersion((v) => v + 1);
  }, []);
  const value = React.useMemo(() => ({ version, reload }), [version, reload]);
  return (
    <PersonaSessionContext.Provider value={value}>{children}</PersonaSessionContext.Provider>
  );
}

export function usePersonaSession() {
  return React.useContext(PersonaSessionContext);
}
