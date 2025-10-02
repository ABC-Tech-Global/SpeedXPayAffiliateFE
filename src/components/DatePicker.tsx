"use client";

import * as React from "react";
import { ChevronDown as ChevronDownIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

export function DatePicker({
  id,
  label,
  value,
  onChange,
  disabled,
  fromYear = 1900,
  toYear = new Date().getFullYear(),
}: {
  id: string;
  label: string;
  value?: Date | null;
  onChange: (d: Date | null) => void;
  disabled?: boolean;
  fromYear?: number;
  toYear?: number;
}) {
  const [open, setOpen] = React.useState(false);

  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor={id} className="px-1">
        {label}
      </Label>
      <Popover open={open} onOpenChange={(v) => !disabled && setOpen(v)}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            id={id}
            className="w-48 justify-between font-normal"
            disabled={disabled}
          >
            {value ? value.toLocaleDateString() : "Select date"}
            <ChevronDownIcon className="h-4 w-4" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto overflow-hidden p-0" align="start">
          <Calendar
            mode="single"
            selected={value ?? undefined}
            captionLayout="dropdown"
            fromYear={fromYear}
            toYear={toYear}
            onSelect={(d) => {
              onChange(d ?? null);
              if (d) setOpen(false);
            }}
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}
