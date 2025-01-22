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
    value: Option[]
    onChange: (values: Option[]) => void
    placeholder?: string
    className?: string
    onInputChange?: (value: string) => void
    inputValue?: string
    onCreateOption?: (value: string) => void
    creatable?: boolean
}

export function MultiSelect({
    options,
    value = [],
    onChange,
    placeholder = "Select options...",
    className,
    onInputChange,
    inputValue,
    onCreateOption,
    creatable
}: MultiSelectProps) {
    const [open, setOpen] = React.useState(false)

    const handleUnselect = (optionToRemove: Option) => {
        onChange(value.filter((option) => option.value !== optionToRemove.value))
    }

    const selectedValues = value.map(v => v.value)

    return (
        <Command className={`overflow-visible bg-white ${className}`}>
            <div className="group border border-input px-3 py-2 text-sm ring-offset-background rounded-md focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2">
                <div className="flex gap-1 flex-wrap">
                    {value.map((option) => (
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
                                .filter((option) => !selectedValues.includes(option.value))
                                .map((option) => (
                                    <CommandItem
                                        key={option.value}
                                        onSelect={() => {
                                            onChange([...value, option])
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