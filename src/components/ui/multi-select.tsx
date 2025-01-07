import * as React from "react"
import { X } from "lucide-react"
import { Command, CommandGroup, CommandItem } from "@/components/ui/command"
import { Badge } from "@/components/ui/badge"

interface Option {
    label: string
    value: string
}

interface MultiSelectProps {
    options: Option[]
    selected: string[]
    onChange: (values: string[]) => void
    placeholder?: string
}

export function MultiSelect({
    options,
    selected,
    onChange,
    placeholder = "Select options..."
}: MultiSelectProps) {
    const [open, setOpen] = React.useState(false)

    const handleUnselect = (valueToRemove: string) => {
        onChange(selected.filter((value) => value !== valueToRemove))
    }

    return (
        <Command className="overflow-visible bg-white">
            <div className="group border border-input px-3 py-2 text-sm ring-offset-background rounded-md focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2">
                <div className="flex gap-1 flex-wrap">
                    {selected && selected.map((value) => {
                        const option = options.find((opt) => opt.value === value)
                        if (!option) return null
                        return (
                            <Badge key={value} variant="secondary">
                                {option.label}
                                <button
                                    className="ml-1 ring-offset-background rounded-full outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                                    onKeyDown={(e) => {
                                        if (e.key === "Enter") {
                                            handleUnselect(value)
                                        }
                                    }}
                                    onMouseDown={(e) => {
                                        e.preventDefault()
                                        e.stopPropagation()
                                    }}
                                    onClick={() => handleUnselect(value)}
                                >
                                    <X className="h-3 w-3" />
                                </button>
                            </Badge>
                        )
                    })}
                    <button
                        className="flex-1 bg-transparent px-2 py-1 text-sm outline-none placeholder:text-muted-foreground"
                        onClick={() => setOpen(true)}
                    >
                        {placeholder}
                    </button>
                </div>
            </div>
            {open && (
                <div className="relative mt-2">
                    <div className="absolute top-0 z-10 w-full rounded-md border bg-popover text-popover-foreground shadow-md outline-none animate-in">
                        <CommandGroup className="h-full overflow-auto max-h-60">
                            {options
                                .filter((option) => !selected.includes(option.value))
                                .map((option) => (
                                    <CommandItem
                                        key={option.value}
                                        onSelect={() => {
                                            onChange([...selected, option.value])
                                            setOpen(false)
                                        }}
                                    >
                                        {option.label}
                                    </CommandItem>
                                ))}
                        </CommandGroup>
                    </div>
                </div>
            )}
        </Command>
    )
}