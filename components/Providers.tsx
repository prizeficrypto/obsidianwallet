"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MiniKitProvider } from "@worldcoin/minikit-js/minikit-provider";
import { useState } from "react";

export default function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30_000,
            retry: 1,
            refetchOnWindowFocus: false,
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>
      <MiniKitProvider
        props={{ appId: process.env.NEXT_PUBLIC_APP_ID ?? "app_staging_placeholder" }}
      >
        {children}
      </MiniKitProvider>
    </QueryClientProvider>
  );
}
