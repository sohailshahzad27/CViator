// frontend/pages/_app.js
// Custom App. AuthProvider keeps the session across client-side route
// changes; ToastProvider hosts the app-wide notification stack so no screen
// has to fall back to window.alert.

import Head from 'next/head';
import '../styles/globals.css';
import { AuthProvider } from '../hooks/useAuth';
import { ToastProvider } from '../components/ui';

export default function App({ Component, pageProps }) {
  return (
    <AuthProvider>
      <ToastProvider>
        <Head>
          <meta name="viewport" content="width=device-width, initial-scale=1" />
          <meta
            name="description"
            content="Cviator — build, preview and export your official GIKI CV as a print-ready PDF."
          />
        </Head>
        <Component {...pageProps} />
      </ToastProvider>
    </AuthProvider>
  );
}
