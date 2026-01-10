import React from 'react';
import { useRouter } from 'next/router';
import { useEffect } from 'react';

export default function Index() {
    const router = useRouter();
    useEffect(() => {
        router.replace('/world-select');
    }, []);
    return <div>Loading...</div>;
}
