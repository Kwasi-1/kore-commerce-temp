import * as React from "react";
import { ChevronDown } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

function formatDigits(value: string) {
  const digits = value.replace(/\D/g, "").slice(0, 15);
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
  if (digits.length <= 10)
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(
    6,
    10,
  )} ${digits.slice(10)}`;
}

type CountryOption = {
  value: string;
  label: string;
  emoji?: string;
};

const defaultCountries: CountryOption[] = [
  { value: "+1", label: "United States", emoji: "ðŸ‡ºðŸ‡¸" },
  { value: "+44", label: "United Kingdom", emoji: "ðŸ‡¬ðŸ‡§" },
  { value: "+233", label: "Ghana", emoji: "ðŸ‡¬ðŸ‡­" },
  { value: "+234", label: "Nigeria", emoji: "ðŸ‡³ðŸ‡¬" },
  { value: "+61", label: "Australia", emoji: "ðŸ‡¦ðŸ‡º" },
];

export interface PhoneInputProps extends Omit<
  React.InputHTMLAttributes<HTMLInputElement>,
  "value" | "defaultValue" | "onChange"
> {
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  label?: string;
  labelPlacement?: "inside" | "outside";
  error?: string;
  countryCode?: string;
  defaultCountryCode?: string;
  onCountryChange?: (value: string) => void;
  countryOptions?: CountryOption[];
}

export const PhoneInput = React.forwardRef<HTMLInputElement, PhoneInputProps>(
  (
    {
      className,
      value,
      defaultValue,
      onValueChange,
      label,
      labelPlacement = "outside",
      error,
      countryCode,
      defaultCountryCode = "+1",
      onCountryChange,
      countryOptions = defaultCountries,
      placeholder,
      ...props
    },
    ref,
  ) => {
    const controlled = value !== undefined;
    const [internalValue, setInternalValue] = React.useState(
      defaultValue || "",
    );

    React.useEffect(() => {
      if (controlled && value !== undefined) {
        setInternalValue(value.replace(/\D/g, ""));
      }
    }, [controlled, value]);

    const digits = controlled
      ? (value?.replace(/\D/g, "") ?? "")
      : internalValue;
    const formatted = formatDigits(digits);

    const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
      const nextDigits = event.target.value.replace(/\D/g, "").slice(0, 15);
      if (!controlled) {
        setInternalValue(nextDigits);
      }
      onValueChange?.(nextDigits);
    };

    const controlledCountry = countryCode !== undefined;
    const [internalCountry, setInternalCountry] =
      React.useState(defaultCountryCode);

    React.useEffect(() => {
      if (controlledCountry && countryCode !== undefined) {
        setInternalCountry(countryCode);
      }
    }, [controlledCountry, countryCode]);

    const currentCountry = controlledCountry ? countryCode! : internalCountry;
    const selectedCountry =
      countryOptions.find((opt) => opt.value === currentCountry) ??
      countryOptions[0];

    if (labelPlacement === "inside" && label) {
      return (
        <div className={cn("flex w-full flex-col", className)}>
          <div
            className={cn(
              "flex w-full flex-col rounded-md border border-input bg-background px-3 py-2 ring-offset-background focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2",
              error && "border-destructive focus-within:ring-destructive",
            )}
          >
            <p
              className="text-xs uppercase text-muted-foreground"
              style={{ letterSpacing: "-0.8px" }}
            >
              {label}
            </p>
            <div className="mt-1 flex items-center">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-auto gap-1 border-r border-input px-2 py-0 hover:bg-accent/50"
                  >
                    <span className="text-base leading-none">
                      {selectedCountry?.emoji ?? "ðŸŒ"}
                    </span>
                    <span className="text-xs font-medium leading-none">
                      {selectedCountry?.value}
                    </span>
                    <ChevronDown className="h-3 w-3 opacity-50" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-[280px]">
                  {countryOptions.map((option) => (
                    <DropdownMenuItem
                      key={option.value}
                      onClick={() => {
                        if (!controlledCountry) {
                          setInternalCountry(option.value);
                        }
                        onCountryChange?.(option.value);
                      }}
                      className="flex items-center gap-2"
                    >
                      {option.emoji && (
                        <span className="text-base">{option.emoji}</span>
                      )}
                      <span className="flex-1">{option.label}</span>
                      <span className="text-xs text-muted-foreground">
                        {option.value}
                      </span>
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
              <input
                ref={ref}
                type="tel"
                value={formatted}
                onChange={handleChange}
                placeholder={placeholder ?? "(555) 123-4567"}
                className="flex-1 bg-transparent px-3 text-sm placeholder:text-muted-foreground focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50"
                {...props}
              />
            </div>
          </div>
          <div className="min-h-[1.25rem]">
            {error && <p className="mt-1 text-xs text-destructive">{error}</p>}
          </div>
        </div>
      );
    }

    return (
      <div className={cn("flex w-full flex-col", className)}>
        {labelPlacement === "outside" && label && (
          <p
            className="mb-2 text-sm font-medium text-foreground"
            style={{ letterSpacing: "-0.8px" }}
          >
            {label}
          </p>
        )}
        <div
          className={cn(
            "flex h-10 w-full items-center rounded-md border border-input bg-background ring-offset-background focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2",
            error && "border-destructive focus-within:ring-destructive",
          )}
        >
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className={cn(
                  "h-full gap-1 rounded-none rounded-l-md border-r border-input px-3 hover:bg-accent/50",
                  error && "border-destructive",
                )}
              >
                <span className="text-base leading-none">
                  {selectedCountry?.emoji ?? "ðŸŒ"}
                </span>
                <span className="text-xs font-medium leading-none">
                  {selectedCountry?.value}
                </span>
                <ChevronDown className="h-3 w-3 opacity-50" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-[280px]">
              {countryOptions.map((option) => (
                <DropdownMenuItem
                  key={option.value}
                  onClick={() => {
                    if (!controlledCountry) {
                      setInternalCountry(option.value);
                    }
                    onCountryChange?.(option.value);
                  }}
                  className="flex items-center gap-2"
                >
                  {option.emoji && (
                    <span className="text-base">{option.emoji}</span>
                  )}
                  <span className="flex-1">{option.label}</span>
                  <span className="text-xs text-muted-foreground">
                    {option.value}
                  </span>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
          <input
            ref={ref}
            type="tel"
            value={formatted}
            onChange={handleChange}
            placeholder={placeholder ?? "(555) 123-4567"}
            className="h-full flex-1 bg-transparent px-3 text-sm placeholder:text-muted-foreground focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50"
            {...props}
          />
        </div>
        <div className="min-h-[1.25rem]">
          {error && <p className="mt-1 text-xs text-destructive">{error}</p>}
        </div>
      </div>
    );
  },
);
PhoneInput.displayName = "PhoneInput";
