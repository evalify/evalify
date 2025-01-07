import * as React from "react"
import { Check, ChevronsUpDown } from "lucide-react"
import { cn } from "@/lib/utils"
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
} from "@/components/ui/command"
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover"
import { Button } from "@/components/ui/button"

interface ComboboxProps {
    options: {
        label: string
        value: string
    }[]
    value?: string
    onSelect: (value: string) => void
    placeholder?: string
    searchPlaceholder?: string
}

export function Combobox({
    options = [], // Provide default empty array
    value,
    onSelect,
    placeholder = "Select option...",
    searchPlaceholder = "Search..."
}: ComboboxProps) {
    const [open, setOpen] = React.useState(false)
    const [searchQuery, setSearchQuery] = React.useState("")

    // Ensure options is always an array before filtering
    const safeOptions = Array.isArray(options) ? options : []
    
    const filteredOptions = React.useMemo(() => {
        if (!searchQuery) return safeOptions;
        return safeOptions.filter((option) =>
            option.label.toLowerCase().includes(searchQuery.toLowerCase())
        );
    }, [searchQuery, safeOptions]);

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={open}
                    className="w-full justify-between"
                >
                    {value
                        ? safeOptions.find((option) => option.value === value)?.label ?? placeholder
                        : placeholder}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-full p-0">
                <Command>
                    <CommandInput 
                        placeholder={searchPlaceholder}
                        value={searchQuery}
                        onValueChange={setSearchQuery}
                    />
                    <CommandEmpty>No results found.</CommandEmpty>
                    <CommandGroup className="max-h-60 overflow-auto">
                        {filteredOptions.map((option) => (
                            <CommandItem
                                key={option.value}
                                onSelect={() => {
                                    onSelect(option.value)
                                    setOpen(false)
                                    setSearchQuery("")
                                }}
                            >
                                <Check
                                    className={cn(
                                        "mr-2 h-4 w-4",
                                        value === option.value ? "opacity-100" : "opacity-0"
                                    )}
                                />
                                {option.label}
                            </CommandItem>
                        ))}
                    </CommandGroup>
                </Command>
            </PopoverContent>
        </Popover>
    )
}
