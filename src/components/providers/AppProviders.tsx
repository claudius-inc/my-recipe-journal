"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { Theme } from "@radix-ui/themes";
import { useState, type ReactNode } from "react";
import { ToastProvider } from "@/context/ToastContext";
import { ToastContainer } from "@/components/ui/ToastContainer";

interface AppProvidersProps {
  children: ReactNode;
}

export function AppProviders({ children }: AppProvidersProps) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 1000 * 30,
            retry: 1,
          },
          mutations: {
            retry: 1,
          },
        },
      }),
  );

  return (
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <Theme accentColor="gold" grayColor="olive" radius="large" scaling="95%">
          {children}
          <ToastContainer />
        </Theme>
      </ToastProvider>
      <ReactQueryDevtools initialIsOpen={false} buttonPosition="bottom-right" />
    </QueryClientProvider>
  );
}
