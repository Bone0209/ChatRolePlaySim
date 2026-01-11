import React from 'react';
import Head from 'next/head';
import { Card, CardContent } from '@/components/ui/card';
import { Backpack, Sword, Shield, FlaskConical, Gem } from 'lucide-react';

export default function Inventory() {
    // Mock inventory items
    const items = [
        { id: 1, name: 'Iron Sword', icon: Sword, type: 'weapon', color: 'text-red-400' },
        { id: 2, name: 'Wooden Shield', icon: Shield, type: 'armor', color: 'text-blue-400' },
        { id: 3, name: 'Health Potion', icon: FlaskConical, type: 'consumable', color: 'text-red-500' },
        { id: 4, name: 'Mana Potion', icon: FlaskConical, type: 'consumable', color: 'text-blue-500' },
        { id: 5, name: 'Magic Gem', icon: Gem, type: 'material', color: 'text-purple-400' },
    ];

    // Generate empty slots to fill grid
    const totalSlots = 12;
    const paddedItems = [...items, ...Array(totalSlots - items.length).fill(null)];

    return (
        <React.Fragment>
            <Head>
                <title>Inventory - AIRolePlaySim</title>
            </Head>
            <div className={`dark flex flex-col h-screen bg-background text-foreground font-sans p-4`}>

                {/* Header */}
                <div className="flex items-center gap-2 mb-4 border-b border-border/40 pb-2">
                    <Backpack className="text-primary" />
                    <h1 className="font-bold text-xl">Inventory</h1>
                </div>

                {/* Grid */}
                <div className="grid grid-cols-3 gap-3">
                    {paddedItems.map((item, index) => (
                        <Card
                            key={index}
                            className={`aspect-square border-border/50 bg-card/40 flex items-center justify-center relative group
                                ${item ? 'hover:bg-card/80 cursor-pointer' : ''}
                            `}
                        >
                            {item ? (
                                <div className="flex flex-col items-center">
                                    <item.icon size={32} className={`mb-1 ${item.color}`} />
                                    <span className="text-[10px] sm:text-xs text-muted-foreground font-medium text-center px-1 truncate w-full">
                                        {item.name}
                                    </span>
                                </div>
                            ) : (
                                <div className="w-2 h-2 rounded-full bg-muted/20" />
                            )}
                        </Card>
                    ))}
                </div>

            </div>
        </React.Fragment>
    );
}
