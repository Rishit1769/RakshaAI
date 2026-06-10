'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState } from 'react';
import { useSocket } from '@/hooks/useSocket';
import { ThemeProvider } from '@/hooks/useTheme';

/** Inner component so useSocket runs inside QueryClientProvider context */
function SocketInitializer() {
  useSocket();
  return null;
}

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000, // 1 minute
            retry: 1,
            refetchOnWindowFocus: false,
          },
          mutations: {
            retry: 0,
          },
        },
      })
  );

  return (
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        <SocketInitializer />
        {children}
      </QueryClientProvider>
    </ThemeProvider>
  );
}
