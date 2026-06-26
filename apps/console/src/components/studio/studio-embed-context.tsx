'use client';

import * as React from 'react';

const StudioEmbedContext = React.createContext(false);

/** When true, nested pages hide duplicate headers (tab shells own the chrome). */
export function StudioEmbedProvider({ children }: { children: React.ReactNode }) {
  return <StudioEmbedContext.Provider value={true}>{children}</StudioEmbedContext.Provider>;
}

export function useStudioEmbed() {
  return React.useContext(StudioEmbedContext);
}
