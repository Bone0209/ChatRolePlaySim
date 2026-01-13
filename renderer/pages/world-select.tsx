import React, { useEffect, useState } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Plus, Play, Globe, Settings } from 'lucide-react';

export default function WorldSelect() {
    const router = useRouter();
    const [worlds, setWorlds] = useState<WorldData[]>([]);

    useEffect(() => {
        if (window.electron?.worldList) {
            window.electron.worldList().then(setWorlds).catch(err => console.error("Failed to load worlds:", err));
        }
    }, []);

    const handlePlayLevel = (worldId: string) => {
        console.log(`Navigating to world ${worldId}`);
        router.push(`/chat?worldId=${worldId}`);
    };

    return (
        <React.Fragment>
            <Head>
                <title>Select World - AIRolePlaySim</title>
            </Head>
            <div className="flex flex-col h-screen p-6 space-y-6">

                {/* Header */}
                <div className="flex items-center justify-between">
                    <div className="space-y-2">
                        <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-blue-400 to-purple-500 text-transparent bg-clip-text">
                            Select World
                        </h1>
                        <p className="text-muted-foreground text-sm">
                            Choose your adventure
                        </p>
                    </div>
                    <Button variant="ghost" size="icon" onClick={() => router.push('/settings')}>
                        <Settings className="w-6 h-6 text-muted-foreground hover:text-primary transition-colors" />
                    </Button>
                </div>

                {/* World List */}
                <div className="flex-1 overflow-y-auto space-y-4">
                    {worlds.map((world) => (
                        <Card
                            key={world.id}
                            className="bg-card/50 backdrop-blur-sm border-border/50 hover:bg-card/80 transition-all cursor-pointer group"
                            onClick={() => handlePlayLevel(world.id)}
                        >
                            <CardContent className="p-4 flex items-center justify-between">
                                <div className="space-y-1">
                                    <div className="flex items-center gap-2">
                                        <Globe size={16} className="text-primary" />
                                        <h2 className="font-semibold text-lg group-hover:text-primary transition-colors">
                                            {world.name}
                                        </h2>
                                    </div>
                                    <p className="text-xs text-muted-foreground">
                                        {world.description || world.prompt.substring(0, 50) + "..."}
                                    </p>
                                    <span className="text-[10px] text-muted-foreground/60 inline-block mt-2">
                                        作成日: {new Date(world.createdAt || Date.now()).toLocaleString('ja-JP', {
                                            year: 'numeric',
                                            month: '2-digit',
                                            day: '2-digit',
                                            hour: '2-digit',
                                            minute: '2-digit',
                                            second: '2-digit',
                                            timeZone: 'Asia/Tokyo'
                                        }).replace(/\//g, '-')}
                                    </span>
                                </div>
                                <Button size="icon" variant="ghost" className="text-muted-foreground group-hover:text-primary">
                                    <Play size={20} />
                                </Button>
                            </CardContent>
                        </Card>
                    ))}
                    {worlds.length === 0 && (
                        <div className="text-center text-muted-foreground mt-8">No worlds found. Create one to start!</div>
                    )}
                </div>

                {/* Footer Actions */}
                <div className="pt-4">
                    <Button
                        className="w-full h-12 text-base shadow-lg shadow-primary/20 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 border-none transition-all duration-300 transform hover:scale-[1.02]"
                        onClick={() => router.push('/world-create')}
                    >
                        <Plus className="mr-2" size={18} />
                        Create New World
                    </Button>
                </div>

            </div>
        </React.Fragment>
    );
}
