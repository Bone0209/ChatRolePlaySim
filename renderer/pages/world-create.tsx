import React, { useState } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Sparkles, Loader2, Play } from 'lucide-react';

export default function WorldCreate() {
    const router = useRouter();
    const [worldName, setWorldName] = useState('');
    const [prompt, setPrompt] = useState('A fantasy world with magic.');
    const [isGeneratingTitle, setIsGeneratingTitle] = useState(false);
    const [isGeneratingDesc, setIsGeneratingDesc] = useState(false);

    // NPC Generation State removed (handled backend side now)
    const [isCreating, setIsCreating] = useState(false);

    const handleGenerateTitle = async () => {
        if (isGeneratingTitle) return;
        setIsGeneratingTitle(true);
        try {
            if (window.electron?.worldGenerate) {
                const title = await window.electron.worldGenerate({ type: 'title', context: prompt });
                if (title && !title.startsWith('Error')) {
                    setWorldName(title);
                }
            }
        } catch (e) {
            console.error(e);
        } finally {
            setIsGeneratingTitle(false);
        }
    };

    const handleGenerateDescription = async () => {
        if (isGeneratingDesc) return;
        if (!worldName) return; // Need a name for context
        setIsGeneratingDesc(true);
        try {
            if (window.electron?.worldGenerate) {
                const desc = await window.electron.worldGenerate({ type: 'description', context: worldName });
                if (desc && !desc.startsWith('Error')) {
                    setPrompt(desc);
                }
            }
        } catch (e) {
            console.error(e);
        } finally {
            setIsGeneratingDesc(false);
        }
    };

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!worldName.trim()) return;

        setIsCreating(true);

        try {
            if (window.electron?.worldCreate) {
                // Pass empty npcList to trigger auto-generation in backend
                const newWorld = await window.electron.worldCreate({
                    name: worldName,
                    prompt: prompt,
                    npcList: []
                });
                router.push(`/chat?worldId=${newWorld.id}`);
            } else {
                console.error("IPC not available");
                setIsCreating(false);
            }
        } catch (err) {
            console.error("Failed to create world:", err);
            setIsCreating(false);
        }
    };

    return (
        <React.Fragment>
            <Head>
                <title>新規ワールド作成 - AIRolePlaySim</title>
            </Head>
            <div className="flex flex-col h-screen p-6 relative overflow-y-auto">

                {/* Back Button */}
                <Button
                    variant="ghost"
                    size="sm"
                    className="absolute top-4 left-2 text-muted-foreground hover:text-foreground"
                    onClick={() => router.back()}
                    disabled={isCreating}
                >
                    <ArrowLeft size={18} className="mr-1" />
                    戻る
                </Button>

                {/* Header */}
                <div className="text-center mt-8 mb-8 space-y-2">
                    <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl mx-auto flex items-center justify-center shadow-lg shadow-purple-500/30 mb-4">
                        <Sparkles className="text-white" size={32} />
                    </div>
                    <h1 className="text-2xl font-bold tracking-tight">
                        新規ワールド作成
                    </h1>
                    <p className="text-muted-foreground text-sm">
                        新しい冒険の世界設定を定義してください。<br />
                        <span className="opacity-70 text-xs">※作成時にAIがあなたのパートナーと開始地点を自動で見つけ出します。</span>
                    </p>
                </div>

                {/* Form */}
                <form onSubmit={handleCreate} className="flex-1 space-y-8 max-w-xl mx-auto w-full pb-10">
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-lg flex items-center gap-2">
                                <Sparkles size={18} className="text-yellow-500" />
                                ワールド基本設定
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium ml-1">ワールド名</label>
                                <div className="flex gap-2">
                                    <Input
                                        value={worldName}
                                        onChange={(e) => setWorldName(e.target.value)}
                                        placeholder="例: エルドリア王国"
                                        className="bg-card/50 border-input/50 focus:border-primary h-12 flex-1"
                                        autoFocus
                                        disabled={isCreating}
                                    />
                                    <Button
                                        type="button"
                                        variant="outline"
                                        className="h-12 w-12 border-input/50 bg-card/50 hover:bg-primary/20 hover:text-primary transition-colors"
                                        onClick={handleGenerateTitle}
                                        disabled={isGeneratingTitle || isCreating}
                                        title="AIで名前を自動生成"
                                    >
                                        {isGeneratingTitle ? <Loader2 className="animate-spin" size={20} /> : <Sparkles size={20} />}
                                    </Button>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-medium ml-1">世界観プロンプト</label>
                                <div className="flex gap-2 items-start">
                                    <Textarea
                                        value={prompt}
                                        onChange={(e) => setPrompt(e.target.value)}
                                        placeholder="世界のルールや設定を記述..."
                                        className="bg-card/50 border-input/50 focus:border-primary min-h-[120px] flex-1 resize-y"
                                        disabled={isCreating}
                                    />
                                    <Button
                                        type="button"
                                        variant="outline"
                                        className="h-12 w-12 border-input/50 bg-card/50 hover:bg-primary/20 hover:text-primary transition-colors shrink-0"
                                        onClick={handleGenerateDescription}
                                        disabled={isGeneratingDesc || !worldName || isCreating}
                                        title="AIで概要を自動生成 (ワールド名が必須)"
                                    >
                                        {isGeneratingDesc ? <Loader2 className="animate-spin" size={20} /> : <Sparkles size={20} />}
                                    </Button>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <div className="pt-4 flex justify-center">
                        <Button
                            type="submit"
                            size="lg"
                            className="w-full font-bold shadow-lg shadow-primary/20 h-14 text-lg"
                            disabled={isCreating}
                        >
                            {isCreating ? (
                                <>
                                    <Loader2 className="animate-spin mr-2" size={24} />
                                    世界を構築中...
                                </>
                            ) : (
                                <>
                                    <Play className="mr-2 fill-current" size={20} />
                                    冒険を始める
                                </>
                            )}
                        </Button>
                        {isCreating && (
                            <p className="text-center text-xs text-muted-foreground mt-4 absolute bottom-4 animate-pulse">
                                AIが地形を生成し、パートナーを探しています...<br />
                                (これには数分かかる場合があります)
                            </p>
                        )}
                    </div>
                </form>
            </div>
        </React.Fragment>
    );
}
