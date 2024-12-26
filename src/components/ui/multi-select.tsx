import * as React from "react"
import { Command as CommandPrimitive } from "cmdk"
import { X } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Command, CommandGroup, CommandItem } from "@/components/ui/command"

interface Option {
    value: string
    label: string
}

interface MultiSelectProps {
    options: Option[]
    value: Option[]
    onChange: (value: Option[]) => void
    placeholder?: string
    className?: string
    creatable?: boolean
    onCreateOption?: (value: string) => void
    onInputChange?: (value: string) => void
    inputValue?: string
}

export function MultiSelect({
    options = [], // Add default value
    value = [], // Add default value
    onChange,
    placeholder = "Select items...",
    className,
    creatable = false,
    onCreateOption,
    onInputChange,
    inputValue = "", // Add default value
}: MultiSelectProps) {
    const [open, setOpen] = React.useState(false)

    // Ensure we're working with arrays even if we get undefined
    const safeOptions = Array.isArray(options) ? options : [];
    const safeValue = Array.isArray(value) ? value : [];

    const handleUnselect = (option: Option) => {
        onChange(safeValue.filter((item) => item.value !== option.value))
    }

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && inputValue && creatable && onCreateOption) {
            e.preventDefault();
            onCreateOption(inputValue);
        }
    };

    return (
        <Command className={className} onKeyDown={handleKeyDown}>
            <div className="flex gap-2 flex-wrap border rounded-md p-2">
                {safeValue.map((option) => (
                    <Badge key={option.value} variant="secondary">
                        {option.label}
                        <button
                            className="ml-1 ring-offset-background rounded-full outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                            onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                    handleUnselect(option)
                                }
                            }}
                            onMouseDown={(e) => {
                                e.preventDefault()
                                e.stopPropagation()
                            }}
                            onClick={() => handleUnselect(option)}
                        >
                            <X className="h-3 w-3" />
                        </button>
                    </Badge>
                ))}
                <CommandPrimitive.Input
                    placeholder={placeholder}
                    className="flex-1 bg-transparent outline-none placeholder:text-muted-foreground min-w-[100px]"
                    value={inputValue}
                    onValueChange={onInputChange}
                />
            </div>
            <div className="relative mt-2">
                {open && (
                    <div className="absolute top-0 z-10 w-full rounded-md border bg-popover text-popover-foreground shadow-md outline-none animate-in">
                        <CommandGroup className="h-full overflow-auto">
                            {safeOptions.map((option) => (
                                <CommandItem
                                    key={option.value}
                                    onSelect={() => {
                                        onChange([...safeValue, option])
                                        setOpen(false)
                                    }}
                                >
                                    {option.label}
                                </CommandItem>
                            ))}
                        </CommandGroup>
                    </div>
                )}
            </div>
        </Command>
    )
}