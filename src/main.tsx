import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'sonner';
import { App } from '@/app/App';
import { AuthProvider } from '@/app/AuthProvider';
import './index.css';

const qc = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: (falhas, erro) => {
        const codigo = (erro as { code?: string }).code;
        // Erro de permissão ou de regra não melhora tentando de novo
        if (codigo === '42501' || codigo === 'P0001' || codigo === 'PGRST116') return false;
        return falhas < 2;
      },
      refetchOnWindowFocus: true,
    },
  },
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={qc}>
      <AuthProvider>
        <App />
      </AuthProvider>
      <Toaster
        position="top-center"
        closeButton
        toastOptions={{
          style: {
            background: 'var(--color-surface)',
            color: 'var(--color-text)',
            border: 'none',
            boxShadow: 'var(--shadow-lg)',
            fontFamily: 'var(--font-body)',
          },
        }}
      />
    </QueryClientProvider>
  </StrictMode>,
);
