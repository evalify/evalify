"use client";

import * as React from "react";
import * as PopoverPrimitive from "@radix-ui/react-popover";
import { CheckIcon, ChevronDownIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export interface DropdownMultiSelectOption {
    label: string;
    value: string;
}

interface DropdownMultiSelectProps {
    options: DropdownMultiSelectOption[];
    selected: string[];
    onChange: (selected: string[]) => void;
    allLabel?: string;
    className?: string;
    disabled?: boolean;
}

export function DropdownMultiSelect({
    options,
    selected,
    onChange,
    allLabel = "All",
    className,
    disabled = false,
}: DropdownMultiSelectProps) {
    const [open, setOpen] = React.useState(false);

    const handleToggle = (value: string) => {
        if (selected.includes(value)) {
            onChange(selected.filter((v) => v !== value));
        } else {
            onChange([...selected, value]);
        }
    };

    const handleSelectAll = () => {
        if (selected.length === options.length) {
            onChange([]);
        } else {
            onChange(options.map((o) => o.value));
        }
    };

    const displayText = React.useMemo(() => {
        if (selected.length === 0 || selected.length === options.length) {
            return allLabel;
        }
        if (selected.length === 1) {
            return options.find((o) => o.value === selected[0])?.label ?? allLabel;
        }
        return `${selected.length} selected`;
    }, [selected, options, allLabel]);

    const isAllSelected = selected.length === 0 || selected.length === options.length;

    return (
        <PopoverPrimitive.Root open={open} onOpenChange={setOpen}>
            <PopoverPrimitive.Trigger
                disabled={disabled}
                className={cn(
                    "border-input data-placeholder:text-muted-foreground [&_svg:not([class*='text-'])]:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/50 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive dark:bg-input/30 dark:hover:bg-input/50 flex w-fit items-center justify-between gap-2 rounded-md border bg-transparent px-3 py-2 text-sm whitespace-nowrap shadow-xs transition-[color,box-shadow] outline-none focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50 h-9",
                    isAllSelected && "text-muted-foreground",
                    className
                )}
            >
                <span className="line-clamp-1">{displayText}</span>
                <ChevronDownIcon className="size-4 opacity-50 shrink-0" />
            </PopoverPrimitive.Trigger>
            <PopoverPrimitive.Portal>
                <PopoverPrimitive.Content
                    align="start"
                    sideOffset={4}
                    className={cn(
                        "bg-popover text-popover-foreground data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 relative z-50 max-h-[300px] min-w-(--radix-popover-trigger-width) overflow-y-auto rounded-md border p-1 shadow-md"
                    )}
                >
                    <div
                        onClick={handleSelectAll}
                        className={cn(
                            "focus:bg-accent focus:text-accent-foreground relative flex w-full cursor-default items-center gap-2 rounded-sm py-1.5 pr-8 pl-2 text-sm outline-hidden select-none hover:bg-accent"
                        )}
                    >
                        <span className="absolute right-2 flex size-3.5 items-center justify-center">
                            {selected.length === options.length && options.length > 0 && (
                                <CheckIcon className="size-4" />
                            )}
                        </span>
                        <span>Select All</span>
                    </div>
                    <div className="bg-border pointer-events-none -mx-1 my-1 h-px" />
                    {options.map((option) => (
                        <div
                            key={option.value}
                            onClick={() => handleToggle(option.value)}
                            className={cn(
                                "focus:bg-accent focus:text-accent-foreground relative flex w-full cursor-default items-center gap-2 rounded-sm py-1.5 pr-8 pl-2 text-sm outline-hidden select-none hover:bg-accent"
                            )}
                        >
                            <span className="absolute right-2 flex size-3.5 items-center justify-center">
                                {selected.includes(option.value) && (
                                    <CheckIcon className="size-4" />
                                )}
                            </span>
                            <span>{option.label}</span>
                        </div>
                    ))}
                    {options.length === 0 && (
                        <div className="py-6 text-center text-sm text-muted-foreground">
                            No options available
                        </div>
                    )}
                </PopoverPrimitive.Content>
            </PopoverPrimitive.Portal>
        </PopoverPrimitive.Root>
    );
}
