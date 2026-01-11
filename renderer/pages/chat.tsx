import React, { useState, useEffect, useRef } from 'react';
import Head from 'next/head';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Send, ArrowLeft, Activity, MessageSquare, Sword, Eye, ChevronDown, ChevronRight, Box, Settings, Map, Scroll, Zap, X, Shield, FlaskConical, Gem, GripVertical, ChevronUp } from 'lucide-react';
import { useRouter } from 'next/router';
import MarkdownRenderer from '@/components/MarkdownRenderer';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';


interface GameState {
    totalSteps: number;
    day: number;
    timeOfDay: string;
    currentStep: number;
}

interface Message {
    id: number;
    text: string;
    emotion?: string;
    sender: 'user' | 'bot';
    senderName: string;
    entityId?: string;
}

interface NpcProperty<T = any> {
    value: T;
    visible: boolean;
    category: 'basic' | 'persona' | 'parameter' | 'state';
}

const CharacterDetailsModal = ({ entity, onClose }: { entity: any, onClose: () => void }) => {
    if (!entity) return null;

    const env = entity.environment || {};
    // Helper to extract value safely
    const getVal = (key: string) => {
        const prop = env[key];
        if (prop && typeof prop === 'object' && 'value' in prop) return prop.value;
        return prop;
    };

    // Helper to get visibility
    const isVisible = (key: string) => {
        const prop = env[key];
        if (prop && typeof prop === 'object' && 'visible' in prop) return prop.visible;
        // Default fallbacks if simplified structure
        return true;
    };

    // Flatten properties for display
    const groups = {
        basic: [] as any[],
        persona: [] as any[],
        parameter: [] as any[],
        state: [] as any[],
        other: [] as any[]
    };

    Object.entries(env).forEach(([key, prop]: [string, any]) => {
        if (key === 'knownDetails') return; // Skip internal list

        let category = 'other';
        let value = prop;
        let visible = true;

        if (prop && typeof prop === 'object' && 'category' in prop) {
            category = prop.category;
            value = prop.value;
            visible = prop.visible;
        } else {
            // Guess category if not explicit (legacy support)
            if (['name', 'race', 'gender', 'ageGroup'].includes(key)) category = 'basic';
            else if (['title', 'appearance', 'publicQuote'].includes(key)) category = 'persona';
            else if (['maxHp', 'strength', 'intelligence'].includes(key)) category = 'parameter';
            else if (['currentHp', 'mood', 'condition'].includes(key)) category = 'state';
        }

        // Check if explicitly hidden AND not unlocked
        if (!visible) {
            // TODO: Check 'knownDetails' or similar to see if unlocked. 
            // For now, if hidden, show "???" or skip?
            // User requested "Show Public Info", implying we hide private.
            // But maybe we show "???" for parameters?
            // Let's store it but mark as hidden for rendering logic
        }

        groups[category as keyof typeof groups]?.push({ key, value, visible });
    });

    const renderSection = (title: string, items: any[]) => {
        if (!items || items.length === 0) return null;
        const visibleItems = items.filter(i => i.visible); // Only show visible
        if (visibleItems.length === 0) return null;

        return (
            <div className="mb-4">
                <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2 border-b border-white/10 pb-1">{title}</h3>
                <div className="grid grid-cols-1 gap-2">
                    {visibleItems.map((item) => (
                        <div key={item.key} className="flex flex-col text-sm">
                            <span className="text-zinc-500 text-xs capitalize">{item.key}</span>
                            <span className="text-zinc-200">{String(item.value)}</span>
                        </div>
                    ))}
                </div>
            </div>
        );
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4" onClick={onClose}>
            <div className="bg-zinc-900 border border-zinc-700 rounded-xl shadow-2xl max-w-md w-full max-h-[85vh] overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
                <div className="p-4 border-b border-white/10 flex justify-between items-center bg-zinc-800">
                    <h2 className="text-lg font-bold text-white">{getVal('name') || entity.name}</h2>
                    <Button variant="ghost" size="icon" onClick={onClose} className="h-6 w-6"><X size={16} /></Button>
                </div>
                <div className="p-4 overflow-y-auto">
                    {renderSection("Basic Info", groups.basic)}
                    {renderSection("Persona", groups.persona)}
                    {renderSection("Status", groups.state)}
                    {renderSection("Parameters", groups.parameter)}
                </div>
            </div>
        </div>
    );
};

// Types are now global in renderer/types/global.d.ts

// Helper to parse emotion from text (e.g. "*Smiles* Hello")
const parseMessage = (rawText: string): { emotion?: string, text: string } => {
    // Regex to match *Emotion* Message (supports multiline)
    const match = rawText.match(/^\*([^*]+)\*\s*([\s\S]*)/);
    if (match) {
        return {
            emotion: match[1].trim(),
            text: match[2].trim()
        };
    }
    return { text: rawText };
};

// Command Mode Definition Removed - Handled by Backend Analysis


type SidePanelContent = 'none' | 'inventory' | 'status' | 'skills' | 'quests' | 'map';

// --- Sortable Widget Component ---
interface SortableWidgetProps {
    id: SidePanelContent;
    onRemove: () => void;
    children: React.ReactNode;
}

const SortableWidget = ({ id, onRemove, children }: SortableWidgetProps) => {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
    const [isCollapsed, setIsCollapsed] = useState(false);

    const style = {
        transform: CSS.Translate.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
    };

    const getWidgetIcon = () => {
        switch (id) {
            case 'inventory': return <Box size={16} className="text-blue-400" />;
            case 'status': return <Activity size={16} className="text-green-400" />;
            case 'skills': return <Zap size={16} className="text-yellow-400" />;
            case 'quests': return <Scroll size={16} className="text-orange-400" />;
            case 'map': return <Map size={16} className="text-cyan-400" />;
            default: return null;
        }
    };

    return (
        <div ref={setNodeRef} style={style} className="bg-background/95 rounded-lg border border-border/10 shadow-lg overflow-hidden flex flex-col">
            <div
                className="p-3 border-b border-border/40 flex items-center justify-between font-semibold bg-background/50 cursor-pointer hover:bg-white/5 transition-colors select-none"
                onClick={() => setIsCollapsed(!isCollapsed)}
            >
                <div className="flex items-center gap-2">
                    <button
                        {...attributes}
                        {...listeners}
                        className="cursor-grab active:cursor-grabbing p-2 -ml-1 rounded hover:bg-white/10 text-muted-foreground transition-colors"
                        title="Drag to reorder"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <GripVertical size={16} />
                    </button>
                    <span className="capitalize flex items-center gap-2">
                        {getWidgetIcon()}
                        <span>{id}</span>
                    </span>
                </div>
                <div className="flex items-center gap-1">
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 text-muted-foreground hover:text-foreground"
                    >
                        {isCollapsed ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
                    </Button>
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 hover:bg-white/10 rounded-full text-red-400/70 hover:text-red-400"
                        onClick={(e) => { e.stopPropagation(); onRemove(); }}
                        title="Close"
                    >
                        <X size={14} />
                    </Button>
                </div>
            </div>
            {!isCollapsed && <div className="p-0 animate-in fade-in slide-in-from-top-1 duration-200">{children}</div>}
        </div>
    );
};

// --- Right Dock Component ---
const RightDock = ({ activeWidgets, onToggleWidget }: { activeWidgets: SidePanelContent[], onToggleWidget: (id: SidePanelContent) => void }) => {
    const allWidgets: SidePanelContent[] = ['status', 'inventory', 'skills', 'quests', 'map'];

    // Helper to get icon
    const getIcon = (id: SidePanelContent) => {
        switch (id) {
            case 'inventory': return <Box size={20} />;
            case 'status': return <Activity size={20} />;
            case 'skills': return <Zap size={20} />;
            case 'quests': return <Scroll size={20} />;
            case 'map': return <Map size={20} />;
            default: return null;
        }
    };

    return (
        <div className="w-[60px] shrink-0 h-full bg-zinc-950 border-l border-white/10 flex flex-col items-center py-4 gap-3 z-20">
            {allWidgets.map(w => {
                const isActive = activeWidgets.includes(w);
                return (
                    <div key={w} className="relative group">
                        <button
                            onClick={() => onToggleWidget(w)}
                            className={`p-3 rounded-xl transition-all duration-300 ${isActive
                                ? 'bg-primary/20 text-primary shadow-[0_0_15px_rgba(59,130,246,0.5)] border border-primary/50'
                                : 'text-zinc-500 hover:text-zinc-200 hover:bg-white/5'
                                }`}
                            title={w.charAt(0).toUpperCase() + w.slice(1)}
                        >
                            {getIcon(w)}
                        </button>
                        {/* Dot indicator for active */}
                        {isActive && <div className="absolute -right-1 top-1/2 -translate-y-1/2 w-1 h-8 bg-primary rounded-l-full" />}
                    </div>
                );
            })}
        </div>
    );
};

// --- Side Panel Components ---

const SidePanelInventory = () => {
    const items = [
        { id: 1, name: 'Iron Sword', icon: Sword, type: 'weapon', color: 'text-red-400' },
        { id: 2, name: 'Wooden Shield', icon: Shield, type: 'armor', color: 'text-blue-400' },
        { id: 3, name: 'Health Potion', icon: FlaskConical, type: 'consumable', color: 'text-red-500' },
        { id: 4, name: 'Mana Potion', icon: FlaskConical, type: 'consumable', color: 'text-blue-500' },
        { id: 5, name: 'Magic Gem', icon: Gem, type: 'material', color: 'text-purple-400' },
    ];

    const totalSlots = 15;
    const paddedItems = [...items, ...Array(totalSlots - items.length).fill(null)];

    return (
        <div className="p-4 flex flex-col gap-4 w-full">
            <div>
                <h3 className="text-xs font-bold text-muted-foreground mb-3 uppercase tracking-wider">Backpack</h3>
                <div className="grid grid-cols-5 gap-1.5 w-full">
                    {paddedItems.map((item, index) => (
                        <div
                            key={index}
                            className={`aspect-square rounded border border-white/10 bg-black/30 flex items-center justify-center transition-all
                                ${item ? 'hover:bg-white/10 hover:border-white/30 cursor-pointer' : ''}
                            `}
                            title={item?.name}
                        >
                            {item ? (
                                <item.icon size={20} className={item.color} />
                            ) : (
                                <div className="w-1 h-1 rounded-full bg-white/10" />
                            )}
                        </div>
                    ))}
                </div>
            </div>
            <div className="p-3 rounded-lg bg-black/30 border border-white/10">
                <h4 className="text-[10px] font-bold text-zinc-500 mb-2 uppercase tracking-wider">Selected Item</h4>
                <div className="flex items-center justify-center h-16 text-zinc-500">
                    <p className="text-xs italic">Select an item</p>
                </div>
            </div>
        </div>
    );
};

const SidePanelStatus = ({ gameState }: { gameState: GameState }) => {
    const status = {
        name: 'Player',
        job: 'Adventurer',
        level: 5,
        exp: 450,
        nextExp: 1000,
        hp: 120,
        maxHp: 150,
        mp: 45,
        maxMp: 50,
        stats: [
            { label: 'STR', value: 12 },
            { label: 'VIT', value: 14 },
            { label: 'DEX', value: 11 },
            { label: 'INT', value: 8 },
            { label: 'MND', value: 10 },
            { label: 'LUK', value: 5 },
        ]
    };

    return (

        <div className="p-4 flex flex-col gap-4 w-full">
            {/* Time / System Info */}
            <div className="flex items-center justify-between bg-black/40 p-2 rounded border border-white/5">
                <div className="text-center">
                    <div className="text-[10px] font-bold text-muted-foreground uppercase">Day</div>
                    <div className="text-lg font-bold text-white leading-none">{gameState?.day || 1}</div>
                </div>
                <div className="text-center flex-1 border-x border-white/10 mx-2">
                    <div className="text-[10px] font-bold text-muted-foreground uppercase">Time</div>
                    <div className="text-sm font-bold text-yellow-400 leading-none">{gameState?.timeOfDay || 'Morning'}</div>
                </div>
                <div className="text-center">
                    <div className="text-[10px] font-bold text-muted-foreground uppercase">Step</div>
                    <div className="text-lg font-bold text-white leading-none">{gameState?.currentStep || 0}<span className="text-[10px] text-zinc-500">/30</span></div>
                </div>
            </div>

            {/* Profile Section */}
            <div className="flex items-center gap-3 w-full">
                <div className="h-14 w-14 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-lg font-bold text-white shadow-lg border-2 border-white/10 shrink-0">
                    {status.name[0]}
                </div>
                <div className="flex-1 min-w-0">
                    <h2 className="text-base font-bold truncate">{status.name}</h2>
                    <p className="text-xs text-muted-foreground">Lv.{status.level} {status.job}</p>
                </div>
            </div>

            {/* Vitals Section */}
            <div className="space-y-3 w-full">
                <div>
                    <div className="flex justify-between text-xs mb-1">
                        <span className="font-bold text-red-400">HP</span>
                        <span className="text-zinc-400">{status.hp}/{status.maxHp}</span>
                    </div>
                    <div className="h-2 w-full bg-zinc-800 rounded-full overflow-hidden">
                        <div className="h-full bg-red-500" style={{ width: `${(status.hp / status.maxHp) * 100}%` }} />
                    </div>
                </div>
                <div>
                    <div className="flex justify-between text-xs mb-1">
                        <span className="font-bold text-blue-400">MP</span>
                        <span className="text-zinc-400">{status.mp}/{status.maxMp}</span>
                    </div>
                    <div className="h-2 w-full bg-zinc-800 rounded-full overflow-hidden">
                        <div className="h-full bg-blue-500" style={{ width: `${(status.mp / status.maxMp) * 100}%` }} />
                    </div>
                </div>
                <div>
                    <div className="flex justify-between text-[10px] mb-1">
                        <span className="font-bold text-zinc-500 uppercase">EXP</span>
                        <span className="text-zinc-500">{((status.exp / status.nextExp) * 100).toFixed(0)}%</span>
                    </div>
                    <div className="h-1 w-full bg-zinc-800 rounded-full overflow-hidden">
                        <div className="h-full bg-yellow-500/60" style={{ width: `${(status.exp / status.nextExp) * 100}%` }} />
                    </div>
                </div>
            </div>

            {/* Stats Section */}
            <div className="w-full">
                <h3 className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2">Attributes</h3>
                <div className="grid grid-cols-3 gap-1.5 w-full">
                    {status.stats.map((stat) => (
                        <div key={stat.label} className="bg-white/5 border border-white/5 px-2 py-1.5 rounded text-center">
                            <div className="text-[10px] font-bold text-zinc-500">{stat.label}</div>
                            <div className="text-sm font-bold">{stat.value}</div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default function Home() {
    const router = useRouter();
    const [messages, setMessages] = useState<Message[]>([]);
    const [inputText, setInputText] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    // Command Mode State Removed
    const bottomRef = useRef<HTMLDivElement>(null);

    // Game State
    const [gameState, setGameState] = useState<GameState>({ totalSteps: 0, day: 1, timeOfDay: 'Start', currentStep: 0 });

    const [targets, setTargets] = useState<{ id: string; name: string }[]>([]);
    const [selectedTarget, setSelectedTarget] = useState<{ id: string; name: string } | null>(null);

    // Show all widgets by default
    const [activeWidgets, setActiveWidgets] = useState<SidePanelContent[]>(['status', 'inventory']);

    // Viewing specific entity details
    const [viewingEntity, setViewingEntity] = useState<any | null>(null);

    const handleCharacterClick = async (entityId?: string, name?: string) => {
        if (!entityId && !name) return;

        try {
            let id = entityId;
            // If no ID (msg from system/mock), try to find by name in targets
            if (!id && name && targets.length > 0) {
                const t = targets.find(t => t.name === name);
                if (t) id = t.id;
            }

            if (id && window.electron?.game?.getEntity) {
                const entity = await window.electron.game.getEntity(id);
                if (entity) {
                    setViewingEntity(entity);
                }
            } else {
                console.log("No entity found or getEntity API missing.");
            }
        } catch (e) {
            console.error("Failed to fetch entity details", e);
        }
    };

    const { worldId } = router.query;

    useEffect(() => {
        if (!worldId) return;

        let isMounted = true;

        const loadInitialState = async () => {
            try {
                // 1. Load History
                const history = await window.electron.game.getChatHistory(worldId as string);
                if (isMounted && history && history.length > 0) {
                    // Map DB history to UI Message type
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    const mappedMessages = history.map((h: any, index: number) => ({
                        id: index, // Use simple index for history, or hash
                        text: h.content,
                        sender: (h.role === 'user' ? 'user' : 'bot') as 'user' | 'bot',
                        senderName: h.speakerName || (h.role === 'user' ? 'Player' : 'System'),
                        entityId: h.entityId,
                        emotion: ''
                    }));
                    setMessages(mappedMessages);
                }

                // 2. Load World State (Time/Location)
                const state = await window.electron.game.getState(worldId as string);
                if (isMounted && state) {
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    const s = state as any;
                    setGameState(s);

                    // Update Targets
                    if (s.npcs && s.npcs.length > 0) {
                        setTargets(s.npcs);
                        // Only set default target if none selected? For now force first.
                        setSelectedTarget(s.npcs[0]);
                    } else {
                        setTargets([]);
                    }
                }
            } catch (e) {
                console.error("Failed to load initial state:", e);
            }
        };

        loadInitialState();

        return () => { isMounted = false; };
    }, [worldId]);

    const toggleWidget = (widget: SidePanelContent) => {
        const canonicalOrder: SidePanelContent[] = ['status', 'inventory', 'skills', 'quests', 'map'];

        setActiveWidgets(prev => {
            if (prev.includes(widget)) {
                return prev.filter(w => w !== widget);
            } else {
                // Add and sort by canonical order
                const newWidgets = [...prev, widget];
                return newWidgets.sort((a, b) => {
                    return canonicalOrder.indexOf(a) - canonicalOrder.indexOf(b);
                });
            }
        });
    };

    const removeWidget = (widget: SidePanelContent) => {
        setActiveWidgets(prev => prev.filter(w => w !== widget));
    };

    // DnD sensors
    const sensors = useSensors(
        useSensor(PointerSensor),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
    );

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;
        if (over && active.id !== over.id) {
            setActiveWidgets((items) => {
                const oldIndex = items.indexOf(active.id as SidePanelContent);
                const newIndex = items.indexOf(over.id as SidePanelContent);
                return arrayMove(items, oldIndex, newIndex);
            });
        }
    };

    const scrollToBottom = () => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const handleSendMessage = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        if (!inputText.trim() || !worldId) return;

        const { emotion, text } = parseMessage(inputText);

        const newMessage: Message = {
            id: Date.now(),
            text: text,
            emotion: emotion,
            sender: 'user',
            senderName: 'Player',
        };

        setMessages((prev) => [...prev, newMessage]);
        setInputText('');
        setIsLoading(true);

        try {
            let replyText = "";
            let replyName = selectedTarget?.name || 'Unknown';

            if (window.electron?.chat) {
                // Prepare History for API
                // Map current messages to role/content
                const apiHistory = messages.map(m => ({
                    role: m.sender === 'user' ? 'user' : 'assistant',
                    content: m.text
                }));
                // Call Electron API with message AND history AND targetId AND worldId (positional args)
                replyText = await window.electron.chat(text, apiHistory, selectedTarget?.id, worldId as string);
            } else {
                // Fallback / Mock
                await new Promise(r => setTimeout(r, 500));
                replyText = `(Mock) 「${text || '...'}」ですね。API接続がありません。`;
            }

            const botResponse: Message = {
                id: Date.now() + 1,
                text: replyText,
                emotion: '', // API currently returns simple string
                sender: 'bot',
                senderName: replyName,
            };
            setMessages((prev) => [...prev, botResponse]);

            // --- Game Step Processing ---
            // Moved to Backend Side (ChatParser)
            // The chat API now handles processing actions and updating global state internally if needed,
            // or we might need to poll for state updates.
            // For now, let's just refresh state after a short delay or if the API returns new state.

            // Re-fetch state to reflect changes
            if (window.electron?.game?.getState) {
                const newState = await window.electron.game.getState(worldId as string);
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                setGameState(newState as any);
            }

        } catch (error) {
            console.error("Chat Error:", error);
            const errorResponse: Message = {
                id: Date.now() + 1,
                text: "エラーが発生しました。",
                sender: 'bot',
                senderName: 'System',
            };
            setMessages((prev) => [...prev, errorResponse]);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <React.Fragment>
            <Head>
                <title>AIRolePlaySim</title>
            </Head>
            {/* Main Layout: Chat (fixed) | Right Widgets (flex) */}
            <div className="h-screen w-full bg-background text-foreground font-sans overflow-hidden flex">

                {/* Chat Panel - Fixed Width */}
                <div className="w-[480px] shrink-0 flex flex-col h-full bg-background border-r border-border/20 relative">
                    {/* Header */}
                    <div className="p-3 border-b border-border/40 flex items-center justify-between bg-background/80 backdrop-blur-md shrink-0">
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-foreground"
                            onClick={() => router.push('/world-select')}
                            title="Back to World Select"
                        >
                            <ArrowLeft size={18} />
                        </Button>
                        <span className="font-bold text-lg tracking-wide bg-gradient-to-r from-blue-400 to-purple-500 text-transparent bg-clip-text">
                            AIRolePlaySim
                        </span>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-foreground"
                            onClick={() => console.log('Open Settings')}
                            title="Settings"
                        >
                            <Settings size={18} />
                        </Button>
                    </div>

                    {/* Chat Area */}
                    <div className="flex-1 p-4 overflow-y-auto min-h-0">
                        <div className="w-full space-y-4">
                            {messages.map((msg) => (
                                <div
                                    key={msg.id}
                                    className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                                >
                                    <div className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'} max-w-[90%]`}>
                                        <span
                                            className={`text-xs mb-1 px-1 font-medium ${msg.sender === 'user' ? 'text-blue-400' : 'text-purple-400 cursor-pointer hover:underline'}`}
                                            onClick={() => msg.sender !== 'user' && handleCharacterClick(msg.entityId, msg.senderName)}
                                        >
                                            {msg.senderName}
                                        </span>
                                        <Card className="border-none shadow-md overflow-hidden bg-zinc-800 text-zinc-100">
                                            <CardContent className="p-3 flex flex-col gap-3">
                                                {msg.emotion && (
                                                    <div className="text-sm italic text-gray-400">
                                                        {msg.emotion}
                                                    </div>
                                                )}
                                                <MarkdownRenderer content={msg.text} />
                                            </CardContent>
                                        </Card>
                                    </div>
                                </div>
                            ))}
                            <div ref={bottomRef} />
                        </div>
                    </div>

                    {/* Input Area */}
                    <div className="p-3 bg-background/80 backdrop-blur-md shrink-0">
                        <form
                            onSubmit={handleSendMessage}
                            className={`relative rounded-xl border-2 bg-card/50 shadow-sm focus-within:ring-2 transition-all flex flex-col border-white/10 ring-white/5`}
                        >
                            <div className="flex items-center px-3 py-1 gap-2">
                                {/* Auto-Detection Mode Indicator */}
                                <div className="flex items-center gap-2 text-xs font-bold text-zinc-400" title="Actions are automatically detected">
                                    <Activity size={14} />
                                    <span>AUTO</span>
                                </div>

                                {targets.length > 0 && (
                                    <>
                                        <div className="h-4 w-px bg-white/10 mx-1" />
                                        <button
                                            type="button"
                                            className="flex items-center gap-1 text-xs font-medium text-zinc-400 hover:text-zinc-200 transition-colors"
                                            title="Select Target"
                                        >
                                            <span>To: {selectedTarget?.name || 'Select'}</span>
                                            <ChevronDown size={10} className="opacity-50" />
                                        </button>
                                    </>
                                )}
                            </div>
                            <div className="h-px bg-white/10 w-full" />
                            <Textarea
                                value={inputText}
                                onChange={(e) => setInputText(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' && !e.shiftKey) {
                                        e.preventDefault();
                                        handleSendMessage();
                                    }
                                }}
                                placeholder={`Type your action or message...`}
                                className="bg-transparent border-none focus-visible:ring-0 focus-visible:ring-offset-0 resize-none min-h-[36px] max-h-[150px] p-2 text-sm font-medium"
                            />
                            <div className="flex items-center justify-end p-2 pt-1 border-t border-white/5">
                                <Button
                                    type="submit"
                                    size="icon"
                                    className={`h-8 w-8 transition-all ${inputText.trim()
                                        ? 'bg-primary text-primary-foreground shadow-md'
                                        : 'bg-muted text-muted-foreground'
                                        }`}
                                    disabled={!inputText.trim()}
                                >
                                    <Send size={16} />
                                </Button>
                            </div>
                        </form>
                    </div>
                </div>

                {/* Right Panel - DnD Widgets Area */}
                <div className="flex-1 min-w-0 h-full bg-background/50 overflow-y-auto p-4">
                    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                        <SortableContext items={activeWidgets} strategy={verticalListSortingStrategy}>
                            <div className="space-y-4">
                                {activeWidgets.map((widget) => (
                                    <SortableWidget key={widget} id={widget} onRemove={() => removeWidget(widget)}>
                                        {widget === 'inventory' && <SidePanelInventory />}
                                        {widget === 'status' && <SidePanelStatus gameState={gameState} />}
                                        {widget !== 'inventory' && widget !== 'status' && (
                                            <div className="p-6 text-center text-muted-foreground text-sm">
                                                <div className="mb-4 flex justify-center opacity-20">
                                                    {widget === 'skills' && <Zap size={48} />}
                                                    {widget === 'quests' && <Scroll size={48} />}
                                                    {widget === 'map' && <Map size={48} />}
                                                </div>
                                                <p>{widget.toUpperCase()} is under construction.</p>
                                            </div>
                                        )}
                                    </SortableWidget>
                                ))}
                            </div>
                        </SortableContext>
                    </DndContext>
                </div>

                {/* Right Dock */}
                <RightDock activeWidgets={activeWidgets} onToggleWidget={toggleWidget} />

                {/* Character Detail Modal */}
                {viewingEntity && (
                    <CharacterDetailsModal entity={viewingEntity} onClose={() => setViewingEntity(null)} />
                )}
            </div>
        </React.Fragment>
    );
}
