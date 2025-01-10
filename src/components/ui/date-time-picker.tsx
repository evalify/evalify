"use client"

import * as React from "react"
import ReactDatePicker from "react-datepicker"
import "react-datepicker/dist/react-datepicker.css"
import { CalendarIcon } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"

interface DateTimePickerProps {
    value: Date
    onChange: (date: Date) => void
}

export function DateTimePicker({ value, onChange }: DateTimePickerProps) {
    return (
        <div className="relative">
            <ReactDatePicker
                selected={value}
                onChange={onChange}
                showTimeSelect
                timeFormat="HH:mm"
                timeIntervals={15}
                dateFormat="MMMM d, yyyy h:mm aa"
                className={cn(
                    "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                    "disabled:cursor-not-allowed disabled:opacity-50"
                )}
                customInput={
                    <Button variant="outline" className="w-[280px] justify-start text-left font-normal">
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {value ? value.toLocaleDateString('en-US', {
                            month: 'long',
                            day: 'numeric',
                            year: 'numeric',
                            hour: 'numeric',
                            minute: 'numeric',
                        }) : 'Pick date and time'}
                    </Button>
                }
            />
        </div>
    )
}

