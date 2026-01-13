
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Plus, Settings as SettingsIcon, User, Monitor, Cpu, ChevronLeft, Check, Save, Trash2, Wifi } from 'lucide-react';

interface UserProfile {
    id: number;
    profileName: string;
}

interface UserSetting {
    listId?: number;
    keyName: string;
    keyValue: string;
    valueType: string;
}

interface GlobalSetting {
    keyName: string;
    keyValue: string;
    valueType: string;
}

export default function SettingsPage() {
    const router = useRouter();
    const [profiles, setProfiles] = useState<UserProfile[]>([]);
    const [activeProfileId, setActiveProfileId] = useState<number | null>(null);
    const [profileSettings, setProfileSettings] = useState<UserSetting[]>([]);
    const [globalSettings, setGlobalSettings] = useState<GlobalSetting[]>([]);
    const [newProfileName, setNewProfileName] = useState('');

    // State for creating new setting
    const [isAddingSetting, setIsAddingSetting] = useState(false);
    const [newSettingKey, setNewSettingKey] = useState('');
    const [newSettingValue, setNewSettingValue] = useState('');

    // Test connection states
    const [testingFirst, setTestingFirst] = useState(false);
    const [testingSecond, setTestingSecond] = useState(false);

    useEffect(() => {
        loadData();
        loadGlobalSettings();
    }, []);

    useEffect(() => {
        if (activeProfileId) {
            loadProfileSettings(activeProfileId);
        } else {
            setProfileSettings([]); // Clear settings if no active profile
        }
    }, [activeProfileId]);

    const loadData = async () => {
        try {
            const data = await (window as any).electron.profile.list();
            setProfiles(data.profiles);
            /* Do not auto-switch active ID if it becomes invalid, logic below handles null case */
            if (!activeProfileId && data.profiles.length > 0) {
                // Initial load
                setActiveProfileId(data.activeId || data.profiles[0].id);
            } else if (activeProfileId && !data.profiles.find((p: UserProfile) => p.id === activeProfileId)) {
                // If active profile was deleted
                setActiveProfileId(data.profiles.length > 0 ? data.profiles[0].id : null);
            } else if (data.profiles.length === 0) {
                setActiveProfileId(null);
            }
        } catch (e) {
            console.error("Failed to load profiles", e);
        }
    };

    const loadProfileSettings = async (id: number) => {
        try {
            const data = await (window as any).electron.profile.getSettings(id);
            // Sort settings
            const sortedData = data.sort((a: UserSetting, b: UserSetting) => {
                const priority = ['PlayerName', 'PlayerGender', 'PlayerDescription'];
                const aIndex = priority.indexOf(a.keyName);
                const bIndex = priority.indexOf(b.keyName);

                if (aIndex !== -1 && bIndex !== -1) return aIndex - bIndex;
                if (aIndex !== -1) return -1;
                if (bIndex !== -1) return 1;

                return a.keyName.localeCompare(b.keyName);
            });
            setProfileSettings(sortedData);
        } catch (e) {
            console.error("Failed to load profile settings", e);
        }
    };

    const loadGlobalSettings = async () => {
        try {
            const data = await (window as any).electron.profile.getGlobalSettings();
            setGlobalSettings(data);
        } catch (e) {
            console.error("Failed to load global settings", e);
        }
    };

    const handleCreateProfile = async () => {
        if (!newProfileName.trim()) return;
        try {
            await (window as any).electron.profile.create(newProfileName);
            setNewProfileName('');
            loadData();
        } catch (e) {
            console.error("Failed to create profile", e);
        }
    };

    const handleDeleteProfile = async (e: React.MouseEvent, id: number) => {
        e.stopPropagation();
        if (!confirm('本当にこのプロファイルを削除しますか？')) return;
        try {
            await (window as any).electron.profile.delete(id);
            loadData();
        } catch (e) {
            console.error("Failed to delete profile", e);
        }
    };

    const handleSwitchProfile = async (id: number) => {
        try {
            await (window as any).electron.profile.switch(id);
            setActiveProfileId(id);
        } catch (e) {
            console.error("Failed to switch profile", e);
        }
    };

    // Global Settings
    const handleGlobalStatusChange = (key: string, value: string) => {
        setGlobalSettings(prev => prev.map(s => s.keyName === key ? { ...s, keyValue: value } : s));
    };

    const handleGlobalSave = async (key: string, value: string, type: string) => {
        if (key.endsWith('.api_key') && !value.trim()) {
            // Ignored empty save if user just cleared input
            return;
        }
        await (window as any).electron.profile.updateGlobalSetting({ key, value, type });
        // Reload settings to get masked value back if it was an api key
        loadGlobalSettings();
    };

    const handleTestConnection = async (target: 'first' | 'second') => {
        if (target === 'first') setTestingFirst(true);
        else setTestingSecond(true);

        try {
            const result = await (window as any).electron.profile.testConnection(target);
            alert(result.message);
        } catch (e: any) {
            alert('Connection test failed: ' + e.message);
        } finally {
            if (target === 'first') setTestingFirst(false);
            else setTestingSecond(false);
        }
    };


    // Profile Settings
    const handleProfileSettingChange = (keyName: string, newValue: string) => {
        setProfileSettings(prev => prev.map(s => s.keyName === keyName ? { ...s, keyValue: newValue } : s));
    };

    const handleProfileSettingSave = async (keyName: string, keyValue: string) => {
        if (!activeProfileId) return;
        await (window as any).electron.profile.updateSetting({ id: activeProfileId, key: keyName, value: keyValue, type: 'string' });
    };

    const handleDeleteSetting = async (keyName: string) => {
        if (!activeProfileId || !confirm(`項目 "${keyName}" を削除しますか？`)) return;
        try {
            await (window as any).electron.profile.deleteSetting({ id: activeProfileId, key: keyName });
            loadProfileSettings(activeProfileId);
        } catch (e) {
            console.error("Failed to delete setting", e);
        }
    };

    const handleAddSetting = async () => {
        if (!activeProfileId || !newSettingKey.trim()) return;
        try {
            await (window as any).electron.profile.updateSetting({ id: activeProfileId, key: newSettingKey, value: newSettingValue, type: 'string' });
            setNewSettingKey('');
            setNewSettingValue('');
            setIsAddingSetting(false);
            loadProfileSettings(activeProfileId);
        } catch (e) {
            console.error("Failed to add setting", e);
        }
    };

    const renderSettingRow = (label: string, key: string) => {
        const setting = globalSettings.find(s => s.keyName === key) || { keyName: key, keyValue: '', valueType: 'string' };

        if (key.endsWith('.context')) {
            const val = parseInt(setting.keyValue) || 4096;
            return (
                <div className="flex items-center justify-between py-2 border-b last:border-0" key={key}>
                    <span className="text-sm font-medium w-1/3 text-muted-foreground">{label}</span>
                    <div className="w-2/3 flex items-center gap-4">
                        <input
                            type="range"
                            min="1000"
                            max="300000"
                            step="1000"
                            className="flex-1 h-2 bg-secondary rounded-lg appearance-none cursor-pointer accent-primary"
                            value={val}
                            onChange={(e) => handleGlobalStatusChange(key, e.target.value)}
                            onMouseUp={() => handleGlobalSave(key, String(val), 'number')}
                            onTouchEnd={() => handleGlobalSave(key, String(val), 'number')}
                        />
                        <Input
                            type="number"
                            className="w-24 text-right font-mono"
                            value={val}
                            onChange={(e) => handleGlobalStatusChange(key, e.target.value)}
                            onBlur={() => handleGlobalSave(key, String(val), 'number')}
                        />
                    </div>
                </div>
            );
        }

        const isApiKey = key.endsWith('.api_key');
        const displayValue = setting.keyValue || '';

        return (
            <div className="flex items-center justify-between py-2 border-b last:border-0" key={key}>
                <span className="text-sm font-medium w-1/3 text-muted-foreground">{label}</span>
                <Input
                    className="w-2/3"
                    value={displayValue}
                    onChange={(e) => handleGlobalStatusChange(key, e.target.value)}
                    onBlur={() => handleGlobalSave(key, setting.keyValue, setting.valueType)}
                    placeholder={isApiKey && displayValue === '(Configured)' ? '設定済み' : ''}
                    onFocus={(e) => {
                        if (isApiKey) {
                            // Clear on focus to allow new input
                            handleGlobalStatusChange(key, '');
                        }
                    }}
                    type={isApiKey ? "password" : "text"}
                />
            </div>
        );
    };

    return (
        <div className="container mx-auto p-6 h-screen flex flex-col">
            <div className="flex items-center gap-4 mb-6">
                <Button variant="ghost" size="icon" onClick={() => router.back()}>
                    <ChevronLeft className="w-6 h-6" />
                </Button>
                <h1 className="text-3xl font-bold flex items-center gap-2">
                    <SettingsIcon className="w-8 h-8" />
                    設定 (Settings)
                </h1>
            </div>

            <div className="flex-1 grid grid-cols-12 gap-8 overflow-hidden">
                {/* Left Sidebar: Profile List */}
                <div className="col-span-4 flex flex-col gap-4 overflow-y-auto pr-2 pl-1 py-1">
                    <div className="flex flex-col gap-2">
                        <div className="flex items-center justify-between">
                            <h2 className="text-xl font-semibold">プロファイル</h2>
                        </div>
                        <div className="flex gap-2">
                            <Input
                                placeholder="新規プロファイル名..."
                                value={newProfileName}
                                onChange={(e) => setNewProfileName(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleCreateProfile()}
                                className="bg-secondary/50 flex-1 min-w-0"
                            />
                            <Button size="icon" onClick={handleCreateProfile} disabled={!newProfileName.trim()} className="shrink-0">
                                <Plus className="w-4 h-4" />
                            </Button>
                        </div>
                    </div>

                    <div className="space-y-3">
                        {profiles.map(p => (
                            <Card
                                key={p.id}
                                className={`group cursor-pointer transition-all hover:shadow-md border-2 ${activeProfileId === p.id ? 'border-primary bg-primary/10 shadow-sm' : 'border-transparent hover:border-border/50'}`}
                                onClick={() => handleSwitchProfile(p.id)}
                            >
                                <CardContent className="p-4 flex items-center gap-3">
                                    {activeProfileId === p.id ? (
                                        <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground shadow-sm">
                                            <Check className="w-5 h-5" />
                                        </div>
                                    ) : (
                                        <div className="h-8 w-8 rounded-full bg-secondary flex items-center justify-center text-muted-foreground">
                                            <User className="w-4 h-4" />
                                        </div>
                                    )}
                                    <div className="flex-1 min-w-0">
                                        <div className={`font-medium truncate ${activeProfileId === p.id ? 'text-primary font-bold' : ''}`}>{p.profileName}</div>
                                        {activeProfileId === p.id && <div className="text-[10px] text-primary/80 font-bold uppercase tracking-wider">Active Profile</div>}
                                    </div>
                                    <Button
                                        size="icon"
                                        variant="ghost"
                                        className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:text-destructive hover:bg-destructive/10"
                                        onClick={(e) => handleDeleteProfile(e, p.id)}
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </Button>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                </div>

                {/* Right Content: Settings */}
                <div className="col-span-8 overflow-y-auto space-y-6 pb-20">

                    {/* LLM (Main) */}
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between">
                            <div>
                                <CardTitle className="flex items-center gap-2">
                                    <Monitor className="w-5 h-5 text-blue-500" />
                                    LLM (メイン)
                                </CardTitle>
                                <CardDescription>メインで使用するLLM（チャット・生成用）の設定</CardDescription>
                            </div>
                            <Button variant="outline" size="sm" onClick={() => handleTestConnection('first')} disabled={testingFirst}>
                                {testingFirst ? <span className="animate-spin mr-2">⏳</span> : <Wifi className="w-4 h-4 mr-2" />}
                                接続テスト
                            </Button>
                        </CardHeader>
                        <CardContent className="space-y-1">
                            {renderSettingRow("API Key", "sys.llm.first.api_key")}
                            {renderSettingRow("End Point", "sys.llm.first.api_endpoint")}
                            {renderSettingRow("Model Name", "sys.llm.first.model")}
                            {renderSettingRow("Context Size", "sys.llm.first.context")}
                        </CardContent>
                    </Card>

                    {/* LLM (Sub) */}
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between">
                            <div>
                                <CardTitle className="flex items-center gap-2">
                                    <Cpu className="w-5 h-5 text-purple-500" />
                                    LLM (サブ)
                                </CardTitle>
                                <CardDescription>サブで使用するLLM（判断・分析用）の設定</CardDescription>
                            </div>
                            <Button variant="outline" size="sm" onClick={() => handleTestConnection('second')} disabled={testingSecond}>
                                {testingSecond ? <span className="animate-spin mr-2">⏳</span> : <Wifi className="w-4 h-4 mr-2" />}
                                接続テスト
                            </Button>
                        </CardHeader>
                        <CardContent className="space-y-1">
                            {renderSettingRow("API Key", "sys.llm.second.api_key")}
                            {renderSettingRow("End Point", "sys.llm.second.api_endpoint")}
                            {renderSettingRow("Model Name", "sys.llm.second.model")}
                            {renderSettingRow("Context Size", "sys.llm.second.context")}
                        </CardContent>
                    </Card>

                    {/* Profile Specific Settings */}
                    {activeProfileId && (
                        <Card>
                            <CardHeader>
                                <CardTitle>プロファイル設定</CardTitle>
                            </CardHeader>
                            <CardContent>
                                {profileSettings.length === 0 ? (
                                    <div className="text-sm text-muted-foreground text-center py-4">個別設定はありません</div>
                                ) : (
                                    <div className="space-y-4">
                                        {profileSettings.map(s => {
                                            const isProtected = ['PlayerName', 'PlayerGender', 'PlayerDescription'].includes(s.keyName);
                                            return (
                                                <div key={s.keyName} className="flex gap-2 items-end">
                                                    <div className="flex-1 flex flex-col gap-1">
                                                        <label className="text-xs font-mono text-muted-foreground">{s.keyName}</label>
                                                        <Input
                                                            value={s.keyValue}
                                                            onChange={(e) => handleProfileSettingChange(s.keyName, e.target.value)}
                                                            onBlur={(e) => handleProfileSettingSave(s.keyName, e.target.value)}
                                                        />
                                                    </div>
                                                    {!isProtected && (
                                                        <Button
                                                            size="icon"
                                                            variant="ghost"
                                                            className="mb-0.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                                                            onClick={() => handleDeleteSetting(s.keyName)}
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                        </Button>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}

                                {/* Add Button at the bottom */}
                                <div className="mt-8 pt-4 border-t">
                                    {isAddingSetting ? (
                                        <div className="flex gap-2 p-4 bg-secondary/20 rounded-lg animate-in fade-in slide-in-from-top-2">
                                            <Input
                                                placeholder="キー名"
                                                value={newSettingKey}
                                                onChange={(e) => setNewSettingKey(e.target.value)}
                                                className="w-1/3"
                                            />
                                            <Input
                                                placeholder="値"
                                                value={newSettingValue}
                                                onChange={(e) => setNewSettingValue(e.target.value)}
                                                className="flex-1"
                                                onKeyDown={(e) => e.key === 'Enter' && handleAddSetting()}
                                            />
                                            <Button onClick={handleAddSetting} disabled={!newSettingKey.trim()}>
                                                <Plus className="w-4 h-4" />
                                            </Button>
                                            <Button variant="ghost" onClick={() => setIsAddingSetting(false)}>
                                                キャンセル
                                            </Button>
                                        </div>
                                    ) : (
                                        <Button variant="outline" className="w-full border-dashed" onClick={() => setIsAddingSetting(true)}>
                                            <Plus className="w-4 h-4 mr-2" />
                                            項目を追加
                                        </Button>
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    )}

                </div>
            </div>
        </div>
    );
}
