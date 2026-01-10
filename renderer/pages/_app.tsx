import React from 'react';
import type { AppProps } from 'next/app';
import '../styles/globals.css';

function MyApp({ Component, pageProps }: AppProps) {
    return (
        <div className="dark min-h-screen bg-background text-foreground font-sans selection:bg-primary/30">
            <Component {...pageProps} />
        </div>
    );
}

export default MyApp;
