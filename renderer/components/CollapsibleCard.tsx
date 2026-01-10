import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { ChevronDown, ChevronUp } from 'lucide-react';

interface CollapsibleCardProps {
    title: string;
    children: React.ReactNode;
    defaultOpen?: boolean;
    className?: string; // Allow external styling if needed
}

export const CollapsibleCard: React.FC<CollapsibleCardProps> = ({
    title,
    children,
    defaultOpen = true,
    className
}) => {
    const [isOpen, setIsOpen] = useState(defaultOpen);

    return (
        <Card className={`bg-card border-border shadow-sm transition-all duration-200 ${className}`}>
            <div
                className="p-3 flex items-center justify-between cursor-pointer hover:bg-muted/50 transition-colors"
                onClick={() => setIsOpen(!isOpen)}
            >
                <p className="text-sm text-muted-foreground uppercase tracking-wider font-medium select-none">
                    {title}
                </p>
                {isOpen ? (
                    <ChevronUp size={16} className="text-muted-foreground" />
                ) : (
                    <ChevronDown size={16} className="text-muted-foreground" />
                )}
            </div>

            {isOpen && (
                <CardContent className="px-3 pb-3 pt-0 animate-in fade-in slide-in-from-top-1 duration-200">
                    {children}
                </CardContent>
            )}
        </Card>
    );
};
