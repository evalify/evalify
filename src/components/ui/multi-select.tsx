'use client';

import * as React from 'react';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from '@/components/ui/command';
import { Badge } from './badge';
import { X } from 'lucide-react';

type Option = {
    value: string;
    label: string;
};

type MultiSelectProps = {
    options: Option[];
    value: string[];
    onValueChange: (value: string[]) => void;
    placeholder?: string;
};

export function MultiSelect({ options = [], value = [], onValueChange, placeholder }: MultiSelectProps) {
    const [open, setOpen] = React.useState(false);

    const selected = value.map(v => options.find(opt => opt.value === v)!).filter(Boolean);

    return (
        <Command className="overflow-visible bg-white">
            <div className="border rounded-md p-2 flex flex-wrap gap-1">
                {selected.map((option) => (
                    <Badge key={option.value} variant="secondary">
                        {option.label}
                        <button
                            className="ml-1"
                            onClick={() => onValueChange(value.filter(v => v !== option.value))}
                        >
                            <X className="h-3 w-3" />
                        </button>
                    </Badge>
                ))}
                <div className="relative">
                    <CommandInput placeholder={placeholder} className="border-0 focus:ring-0" />
                    {open && (
                        <div className="absolute z-10 mt-2 border rounded-md bg-white w-full">
                            <CommandEmpty>No results found.</CommandEmpty>
                            <CommandGroup>
                                {options.map((option) => (
                                    <CommandItem
                                        key={option.value}
                                        onSelect={() => {
                                            onValueChange(
                                                value.includes(option.value)
                                                    ? value.filter(v => v !== option.value)
                                                    : [...value, option.value]
                                            );
                                        }}
                                    >
                                        {option.label}
                                    </CommandItem>
                                ))}
                            </CommandGroup>
                        </div>
                    )}
                </div>
            </div>
        </Command>
    );
}