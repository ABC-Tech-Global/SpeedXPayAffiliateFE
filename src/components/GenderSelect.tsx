"use client";

import * as React from "react";
import { ChevronDown as ChevronDownIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Label } from "@/components/ui/label";

type Gender = "male" | "female";

export function GenderSelect({
  value,
  onChange,
  disabled,
  placeholder = "Select gender",
  id,
  label,
}: {
  value?: Gender | "";
  onChange: (v: Gender | "") => void;
  disabled?: boolean;
  placeholder?: string;
  id?: string;
  label?: string;
}) {
  const [open, setOpen] = React.useState(false);
  const displayLabel = value === "male" ? "Male" : value === "female" ? "Female" : placeholder;
  return (
    <div className="flex flex-col gap-2">
      {label && <Label htmlFor={id}>{label}</Label>}
      <Popover open={open} onOpenChange={(v) => !disabled && setOpen(v)}>
        <PopoverTrigger asChild>
          <Button
            id={id}
            type="button"
            variant="outline"
            className="w-48 justify-between font-normal"
            disabled={disabled}
          >
            {displayLabel}
            <ChevronDownIcon className="h-4 w-4" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-48 p-0" align="start">
          <div className="py-1 text-sm">
            <button
              type="button"
              className="w-full text-left px-3 py-2 hover:bg-accent"
              onClick={() => { onChange("male"); setOpen(false); }}
            >
              Male
            </button>
            <button
              type="button"
              className="w-full text-left px-3 py-2 hover:bg-accent"
              onClick={() => { onChange("female"); setOpen(false); }}
            >
              Female
            </button>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}

