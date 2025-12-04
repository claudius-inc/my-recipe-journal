"use client";

import { QueryClient } from "@tanstack/react-query";
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { Theme } from "@radix-ui/themes";
import { useState, type ReactNode } from "react";
import { ToastProvider } from "@/context/ToastContext";
import { ToastContainer } from "@/components/ui/ToastContainer";
import { get, set, del } from "idb-keyval";
import type { PersistedClient, Persister } from "@tanstack/react-query-persist-client";

interface AppProvidersProps {
  children: ReactNode;
}

// Create an IDB persister
const createIDBPersister = (idbValidKey: IDBValidKey = "reactQuery"): Persister => ({
  persistClient: async (client: PersistedClient) => {
    await set(idbValidKey, client);
  },
  restoreClient: async () => {
    return await get<PersistedClient>(idbValidKey);
  },
  removeClient: async () => {
    await del(idbValidKey);
  },
});

export function AppProviders({ children }: AppProvidersProps) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: Infinity, // Data is fresh forever
            gcTime: 1000 * 60 * 60 * 24, // Keep in memory for 24h
            retry: 1,
          },
          mutations: {
            retry: 1,
          },
        },
      }),
  );

  const [persister] = useState(() => createIDBPersister());

  return (
    <PersistQueryClientProvider
      client={queryClient}
      persistOptions={{ persister, maxAge: 1000 * 60 * 60 * 24 }}
    >
      <ToastProvider>
        <Theme accentColor="gold" grayColor="olive" radius="large" scaling="95%">
          {children}
          <ToastContainer />
        </Theme>
      </ToastProvider>
      <ReactQueryDevtools initialIsOpen={false} buttonPosition="bottom-right" />
    </PersistQueryClientProvider>
  );
}
