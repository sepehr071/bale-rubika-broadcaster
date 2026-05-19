import './styles/globals.css';

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { DirectionProvider } from '@radix-ui/react-direction';
import { RouterProvider } from 'react-router-dom';

import { router } from './router';
import { Toaster } from './components/ui/sonner';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, refetchOnReconnect: false },
    mutations: { retry: 0 },
  },
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <DirectionProvider dir="rtl">
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={router} />
        <Toaster />
      </QueryClientProvider>
    </DirectionProvider>
  </StrictMode>,
);
