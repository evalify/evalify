import * as React from 'react'
import { Plus, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '../ui/button';

interface EditorTabsProps {
    tabs: Array<{ id: string; name: string; language: string }>
    activeTab: string
    onTabChange: (tabId: string) => void
    onTabClose: (tabId: string) => void
    onNewFile: () => void
}

export function EditorTabs({ tabs, activeTab, onTabChange, onTabClose,onNewFile }: EditorTabsProps) {
    return (
        <div className="flex border-b">
            {tabs.map((tab) => (
                <div
                    key={tab.id}
                    className={cn(
                        "flex items-center px-4 py-2 border-r cursor-pointer",
                        activeTab === tab.id ? "bg-background" : "bg-muted hover:bg-background/80"
                    )}
                    onClick={() => onTabChange(tab.id)}
                >
                    <span className="mr-2">{tab.name}</span>
                    <button
                        className="text-muted-foreground hover:text-foreground"
                        onClick={(e) => {
                            e.stopPropagation()
                            onTabClose(tab.id)
                        }}
                    >
                        <X className="h-4 w-4" />
                    </button>
                </div>
            ))}
            <Button variant="ghost" size="icon" onClick={onNewFile}>
                <Plus className="h-4 w-4" />
            </Button>
        </div>
    )
}

