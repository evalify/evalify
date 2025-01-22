'use client'

import * as React from 'react'
import { Calendar as CalendarPrimitive } from '@/components/ui/calendar'
import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { cn } from '@/lib/utils'
import { format } from 'date-fns'
import { CalendarIcon, Clock, ChevronUp, ChevronDown } from 'lucide-react'

interface DateTimePickerProps {
    value: Date
    onChange: (date: Date) => void
    minDate?: Date
    maxDate?: Date
}

export function EnhancedDateTimePicker({ value, onChange, minDate, maxDate }: DateTimePickerProps) {
    const [selectedDate, setSelectedDate] = React.useState<Date>(value)
    const [isOpen, setIsOpen] = React.useState(false)

    React.useEffect(() => {
        setSelectedDate(value);
    }, [value]);

    const handleDateSelect = (date: Date | undefined) => {
        if (date) {
            const newDateTime = new Date(date)
            // Preserve current time when changing date
            newDateTime.setHours(selectedDate.getHours())
            newDateTime.setMinutes(selectedDate.getMinutes())
            newDateTime.setSeconds(0, 0) // Reset seconds and milliseconds
            setSelectedDate(newDateTime)
            onChange(newDateTime)
        }
    }

    const handleTimeChange = (type: 'hours' | 'minutes', increment: number) => {
        const newDateTime = new Date(selectedDate)
        newDateTime.setSeconds(0, 0) // Reset seconds and milliseconds

        if (type === 'hours') {
            const newHours = (newDateTime.getHours() + increment + 24) % 24;
            newDateTime.setHours(newHours);
        } else {
            const newMinutes = (newDateTime.getMinutes() + increment + 60) % 60;
            newDateTime.setMinutes(newMinutes);
        }
        
        setSelectedDate(newDateTime)
        onChange(newDateTime)
    }

    const isDateDisabled = (date: Date) => {
        if (minDate && date < minDate) return true
        if (maxDate && date > maxDate) return true
        return false
    }

    return (
        <Popover open={isOpen} onOpenChange={setIsOpen}>
            <PopoverTrigger asChild>
                <Button
                    variant="outline"
                    className={cn(
                        "w-full justify-start text-left font-normal",
                        !value && "text-muted-foreground",
                        "hover:bg-primary hover:text-primary-foreground transition-colors"
                    )}
                >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {selectedDate ? format(selectedDate, "PPp") : <span>Pick date and time</span>}
                </Button>
            </PopoverTrigger>
            <PopoverContent
                className="w-auto p-0"
                align="start"
                onOpenAutoFocus={(e) => e.preventDefault()}
                onPointerDownOutside={(e) => e.preventDefault()}
                onInteractOutside={(e) => e.preventDefault()}
            >
                <div className="p-4" onPointerDownCapture={(e) => e.stopPropagation()}>
                    <CalendarPrimitive
                        mode="single"
                        selected={selectedDate}
                        onSelect={handleDateSelect}
                        disabled={isDateDisabled}
                        initialFocus
                        className="rounded-md border shadow"
                    />
                </div>
                <div className="flex items-center justify-between p-4 bg-muted/50" onPointerDownCapture={(e) => e.stopPropagation()}>
                    <div className="flex items-center space-x-2">
                        <Clock className="h-5 w-5 text-muted-foreground" />
                        <span className="text-sm font-medium">Time</span>
                    </div>
                    <div className="flex items-center space-x-4">
                        <TimeSelector
                            value={selectedDate.getHours()}
                            onChange={(increment) => handleTimeChange('hours', increment)}
                            formatter={(v) => v.toString().padStart(2, '0')}
                        />
                        <span className="text-xl font-semibold">:</span>
                        <TimeSelector
                            value={selectedDate.getMinutes()}
                            onChange={(increment) => handleTimeChange('minutes', increment)}
                            formatter={(v) => v.toString().padStart(2, '0')}
                        />
                    </div>
                </div>
                <div className="p-4 bg-muted/20 rounded-b-lg" onPointerDownCapture={(e) => e.stopPropagation()}>
                    <Button
                        className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
                        onClick={() => setIsOpen(false)}
                    >
                        Confirm
                    </Button>
                </div>
            </PopoverContent>
        </Popover>
    )
}

interface TimeSelectorProps {
    value: number
    onChange: (increment: number) => void
    formatter: (value: number) => string
}

function TimeSelector({ value, onChange, formatter }: TimeSelectorProps) {
    return (
        <div className="flex flex-col items-center">
            <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => onChange(1)}
            >
                <ChevronUp className="h-4 w-4" />
            </Button>
            <div className="text-2xl font-semibold my-1">{formatter(value)}</div>
            <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => onChange(-1)}
            >
                <ChevronDown className="h-4 w-4" />
            </Button>
        </div>
    )
}
