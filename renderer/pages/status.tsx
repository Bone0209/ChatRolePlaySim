import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import { Card, CardContent } from '@/components/ui/card';
import { CollapsibleCard } from '@/components/CollapsibleCard';
import { getTimeDescription, getHpDescription, getMpDescription } from '@/lib/statusUtils';

export default function Status() {
    // State
    const [gameState, setGameState] = useState({ totalSteps: 0, day: 1, timeOfDay: 'Morning', currentStep: 0 });

    const router = useRouter();
    const { worldId } = router.query;

    useEffect(() => {
        if (!worldId) return;
        if (window.electron?.game?.getState) {
            window.electron.game.getState(worldId as string).then(setGameState).catch(console.error);
        }
    }, [worldId]);

    // Converted to generic list structure
    const statusItems = [
        { name: "Condition", display_text: "Normal" },
        { name: "Health", display_text: getHpDescription(100, 100) },
        { name: "Mind", display_text: getMpDescription(50, 50) }
    ];

    return (
        <React.Fragment>
            <Head>
                <title>Status - AIRolePlaySim</title>
            </Head>
            <div className={`dark flex flex-col h-screen bg-background text-foreground font-sans p-4 space-y-3 overflow-y-auto custom-scrollbar`}>

                {/* Header */}
                <div className="flex items-center gap-2 border-b border-border/40 pb-2 w-full">
                    <h1 className="font-bold text-base tracking-tight shrink-0">STATUS</h1>
                    <div className="h-[1px] bg-border/40 w-full ml-2"></div>
                </div>

                <div className="w-full space-y-3">
                    {/* Time & Date Group */}
                    <Card className="bg-card/50 border-border shadow-sm">
                        <CardContent className="p-3">
                            <div className="flex flex-row items-center justify-between gap-2">
                                <div>
                                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium mb-0.5">TIME</p>
                                    <p className="text-sm font-bold tracking-tight">{gameState.timeOfDay}</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium mb-0.5">DAY</p>
                                    <p className="text-sm font-mono font-semibold">{gameState.day} <span className="text-xs text-muted-foreground">({gameState.currentStep}/30)</span></p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Generic Status Grid */}
                    <div className="grid grid-cols-1 gap-2">
                        {statusItems.map((item, index) => (
                            <CollapsibleCard key={index} title={item.name} className="bg-card/50 border-border">
                                <p className="text-sm font-medium leading-snug">{item.display_text}</p>
                            </CollapsibleCard>
                        ))}
                    </div>
                </div>

            </div>
        </React.Fragment>
    );
}
