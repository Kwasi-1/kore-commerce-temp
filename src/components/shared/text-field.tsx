import { cn } from "@/lib/utils";
import { Icon } from "@iconify/react";
import { Spinner } from "@nextui-org/react";
import { Select, SelectItem } from "@nextui-org/select";
import { Autocomplete, AutocompleteItem } from "@nextui-org/autocomplete";
import { format } from "date-fns";
import { isEmpty } from "lodash";
import { CalendarIcon } from "lucide-react";
import React, {
  FC,
  InputHTMLAttributes,
  RefCallback,
  useState,
  useEffect,
} from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface CustomSelectFieldProps {
  label?: string;
  placeholder?: string;
  isDisabled?: boolean;
  error?: string;
  labelPlacement?: "outside" | "outside-left" | "inside";
  className?: string;
  value?: string | string[];
  options: Array<{ label: string; value: any } | string>;
  required?: boolean;
  selectionMode?: "single" | "multiple";
  inputProps?: {
    onChange?: (e: React.ChangeEvent<HTMLSelectElement>) => void;
    onBlur?: (e: any) => unknown;
    ref?: RefCallback<HTMLSelectElement>;
    name?: string;
    required?: boolean;
    disabled?: boolean;
    isDisabled?: boolean;
    selectedKeys?: Array<any>;
    onSelectionChange?: (e: any) => unknown;
  };
  isLoading?: boolean;
  unselectable?: "on" | "off";
  selectedKey?: any;
  searchable?: boolean;
}

export const CustomSelectField: FC<CustomSelectFieldProps> = ({
  label = "",
  options,
  error,
  inputProps,
  value,
  placeholder,
  className,
  required = false,
  isLoading = false,
  labelPlacement = "inside",
  selectionMode = "single",
  unselectable = "off",
  isDisabled = false,
}) => {
  const [showMsg, setShowMsg] = useState(false);
  const [isFocused, setIsFocused] = useState(false);

  // Determine if label should float
  const hasValue =
    value &&
    (typeof value === "string"
      ? value.length > 0
      : (value as string[]).length > 0);
  const shouldFloat = isFocused || hasValue || isDisabled;

  if (labelPlacement === "inside") {
    // Custom floating label implementation for inside placement
    return (
      <div className="relative">
        <div className="relative">
          {/* Custom floating label */}
          <label
  className={cn(
    "absolute left-3 transition-all duration-200 ease-in-out pointer-events-none transform origin-top-left capitalize tracking-wide z-10",
    shouldFloat
      ? "top-1.5 text-[10px] font-normal max-w-[85%] leading-tight"
      : "top-1/2 -translate-y-1/2 text-sm ml-2 text-muted-foreground",
  )}
>
            {required ? (
              <span>
                {label} <span className="text-red-500">*</span>
              </span>
            ) : (
              label
            )}
          </label>

          {/* Select field */}
          <Select
            variant={"faded"}
            size="md"
            aria-label={label || "*"}
            value={value}
            isDisabled={isDisabled}
            unselectable={unselectable}
            placeholder={shouldFloat ? placeholder : ""}
            labelPlacement="outside"
            selectionMode={selectionMode}
            selectedKeys={selectionMode == "single" ? [value] : new Set(value)}
            radius="md"
            isLoading={isLoading}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            {...(inputProps ?? {})}
            endContent={
              error ? (
                <Icon
                  onClick={() => setShowMsg(true)}
                  icon="material-symbols:error-outline"
                  color="orange"
                />
              ) : null
            }
            classNames={{
              trigger: cn(
  `data-[hover=true]:shadow-none shadow-none border border-input bg-background rounded-md text-[12px] min-h-[56px] h-[56px]`,
  shouldFloat ? "pt-7 pb-1" : "py-3",  // ← pt-7 pushes value down further
  "px-3",
  className,
  error && "border-red-400",
),
              label: "hidden",
              popoverContent: "rounded-md",
            }}
          >
            {options?.map((option: any) => (
              <SelectItem
                classNames={{
                  base: "rounded-md",
                }}
                key={option?.value || option}
                value={option?.value || option}
              >
                {option?.label || option}
              </SelectItem>
            ))}
          </Select>
        </div>

        {showMsg ? (
          <span className="text-red-400 text-xs mt-1 block">{error}</span>
        ) : null}
      </div>
    );
  }

  // Outside label placement — default NextUI behavior
  return (
    <div>
      <Select
        variant={"faded"}
        size="md"
        aria-label={label || "*"}
        value={value}
        isDisabled={isDisabled}
        label={
          required ? (
            <span>
              {label} <span className="text-red-500">*</span>
            </span>
          ) : (
            label
          )
        }
        unselectable={unselectable}
        placeholder={placeholder}
        labelPlacement={labelPlacement}
        selectionMode={selectionMode}
        selectedKeys={selectionMode == "single" ? [value] : new Set(value)}
        radius="md"
        isLoading={isLoading}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        {...(inputProps ?? {})}
        endContent={
          error && (
            <Icon
              onClick={() => setShowMsg(true)}
              icon="material-symbols:error-outline"
              color="orange"
            />
          )
        }
        classNames={{
          trigger: cn(
            `data-[hover=true]:shadow-none shadow-none border border-input bg-background rounded-md text-[12px] py-1`,
            className,
          ),
          label: ` text-xs capitalize mt-1`,
          popoverContent: "rounded-md",
        }}
      >
        {options?.map((option: any) => (
          <SelectItem
            classNames={{
              base: "rounded-md",
            }}
            key={option?.value || option}
            value={option?.value || option}
          >
            {option?.label || option}
          </SelectItem>
        ))}
      </Select>

      {showMsg ? (
        <span className="text-red-400 text-[12px]">{error}</span>
      ) : null}
    </div>
  );
};

// CUSTOM INPUT
interface CustomInputTextFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  type?: "text" | "number" | "date" | "email" | "password" | "tel" | "url";
  onChange?: (e: any) => unknown;
  placeholder?: string;
  required?: boolean;
  error?: string;
  height?: string;
  value?: string;
  labelPlacement?: "outside" | "outside-left" | "inside";
  label?: string;
  isLoading?: boolean;
  disabled?: boolean;
  inputProps?: {
    onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
    onBlur?: (e: any) => unknown;
    ref?: RefCallback<HTMLInputElement>;
    name?: string;
    min?: string | number;
    max?: string | number;
    maxLength?: number;
    minLength?: number;
    pattern?: string;
    required?: boolean;
    disabled?: boolean;
  } & Record<string, any>;
  startContent?: React.ReactNode;
  endContent?: React.ReactNode;
  isClearabe?: boolean;
  onClear?: () => void;
}

export const CustomInputTextField = (props: CustomInputTextFieldProps) => {
  const {
    type,
    label,
    placeholder,
    required = false,
    inputProps,
    error,
    isLoading = false,
    disabled,
    value,
    onChange,
    height = "h-[3.5rem]",
    labelPlacement = "inside",
    startContent,
    endContent,
    isClearabe = false,
    onClear,
    onKeyDown,
  } = props;

  const [isFocused, setIsFocused] = useState(false);

  // Determine if label should be in "floated" state
  const hasValue = value && value.length > 0;
  const shouldFloat = isFocused || hasValue || disabled;

  // For floating label effect, we need to handle focus and blur manually
  const handleFocus = (e: any) => {
    setIsFocused(true);
    if (inputProps?.onFocus) {
      inputProps.onFocus(e);
    }
  };

  const handleBlur = (e: any) => {
    setIsFocused(false);
    if (inputProps?.onBlur) {
      inputProps.onBlur(e);
    }
  };

  if (labelPlacement === "inside") {
    // Custom floating label implementation for inside placement
    return (
      <div className="relative">
        <div className="relative">
          {isLoading && (
            <Icon
              icon="eos-icons:loading"
              className="absolute z-10 top-1/2 -translate-y-1/2 right-3 text-[20px]"
            />
          )}

          {/* Custom floating label */}
          <label
            className={cn(
              "absolute left-3 transition-all duration-200 ease-in-out pointer-events-none transform origin-top-left capitalize tracking-wide z-10",
              shouldFloat
                ? "top-2 text-sm scale-75 font-normal"
                : "top-1/2 -translate-y-1/2 text-sm ml-2 text-muted-foreground",
            )}
          >
            {required ? (
              <span>
                {label} <span className="text-red-500">*</span>
              </span>
            ) : (
              label
            )}
          </label>

          {/* Input field */}
          <input
            type={type ?? "text"}
            value={value}
            onChange={onChange}
            onFocus={handleFocus}
            onBlur={handleBlur}
            onKeyDown={onKeyDown}
            disabled={disabled}
            placeholder={shouldFloat ? placeholder : ""}
            {...(inputProps ?? {})}
            className={cn(
              "w-full bg-background border border-input rounded-md",
              startContent ? "pl-9" : "pl-3",
              endContent || isClearabe || error ? "pr-10" : "pr-3",
              shouldFloat ? "pt-6 pb-2" : "py-3",
              "focus:border-primary-green focus:ring-1 focus:ring-primary-green outline-none focus:outline-none",
              "disabled:cursor-not-allowed disabled:opacity-50",
              "transition-all duration-200",
              height.replace("h-", "min-h-"),
              error && "border-red-400 focus:border-red-400 focus:ring-red-400",
            )}
          />

          {/* Start content */}
          {startContent && (
            <div
              className={`absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none ${shouldFloat && labelPlacement === "inside" ? "top-[65%] mb-2" : "hidden"}`}
            >
              {startContent}
            </div>
          )}

          {/* End content */}
          <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1">
            {endContent}
            {isClearabe && value && (
              <button
                type="button"
                onClick={onClear}
                className="text-gray-400 hover:text-muted-foreground transition-colors"
                title="Clear input"
                aria-label="Clear input"
              >
                <Icon icon="material-symbols:close" className="text-sm" />
              </button>
            )}
            {error && (
              <Icon
                icon="material-symbols:error-outline"
                className="text-orange-500"
              />
            )}
          </div>
        </div>

        {error && (
          <span className="text-red-400 text-xs mt-1 block">{error}</span>
        )}
      </div>
    );
  }

  // Outside label placement — native label + input (consistent with project styling)
  return (
    <div className="flex flex-col w-full">
      {label && (
        <label className="text-[12px] text-muted-foreground capitalize mb-1 font-medium">
          {required ? (
            <span>
              {label} <span className="text-red-500">*</span>
            </span>
          ) : (
            label
          )}
        </label>
      )}

      <div className="relative">
        {isLoading && (
          <Icon
            icon="eos-icons:loading"
            className="absolute z-10 top-1/2 -translate-y-1/2 right-3 text-[20px]"
          />
        )}

        {/* Start content */}
        {startContent && (
          <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none">
            {startContent}
          </div>
        )}

        <input
          type={type ?? "text"}
          value={value}
          onChange={onChange}
          onKeyDown={onKeyDown}
          disabled={disabled}
          placeholder={placeholder}
          {...(inputProps ?? {})}
          className={cn(
            "w-full bg-background border border-input rounded-md",
            startContent ? "pl-9" : "pl-3",
            endContent || isClearabe || error ? "pr-10" : "pr-3",
            "py-3",
            "focus:border-primary-green focus:ring-1 focus:ring-primary-green outline-none focus:outline-none",
            "disabled:cursor-not-allowed disabled:opacity-50",
            "transition-all duration-200 text-sm",
            height.replace("h-", "min-h-"),
            error && "border-red-400 focus:border-red-400 focus:ring-red-400",
          )}
        />

        {/* End content */}
        <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1">
          {endContent}
          {isClearabe && value && (
            <button
              type="button"
              onClick={onClear}
              className="text-gray-400 hover:text-muted-foreground transition-colors"
              title="Clear input"
              aria-label="Clear input"
            >
              <Icon icon="material-symbols:close" className="text-sm" />
            </button>
          )}
          {error && (
            <Icon
              icon="material-symbols:error-outline"
              className="text-orange-500"
            />
          )}
        </div>
      </div>

      {error && (
        <span className="text-red-400 text-xs mt-1 block">{error}</span>
      )}
    </div>
  );
};

interface CustomDateInputFieldProps {
  error?: string;
  label: string;
  placeholder?: string;
  inputProps?: {
    onChange: (e: any) => unknown;
    onBlur?: (e: any) => unknown;
    ref?: RefCallback<HTMLInputElement>;
    name?: string;
    min?: string | number;
    max?: string | number;
    maxLength?: number;
    minLength?: number;
    pattern?: string;
    required?: boolean;
    disabled?: boolean;
  };
  value?: Date;
}
export const CustomDateInputField = (props: CustomDateInputFieldProps) => {
  const { inputProps, error, placeholder, label, value } = props;

  return (
    <div className="flex flex-col w-full">
      <label className="dark:text-[#929292] capitalize text-[12px] leading-none whitespace-nowrap">
        {label}
      </label>
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className={`pl-3 text-left font-normal w-full justify-start border border-input bg-background rounded-md h-[3.5rem] ${
              !value && "text-muted-foreground"
            }`}
          >
            {value ? (
              format(value, "PPP")
            ) : (
              <span className="text-slate-500 text-sm">{placeholder}</span>
            )}
            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            selected={value}
            disabled={(date) => date < new Date()}
            {...(inputProps?.onChange ? { onSelect: inputProps.onChange } : {})}
          />
        </PopoverContent>
      </Popover>
      {/* <input
					type="date"
					{...(inputProps ?? {})}
					className="bg-transparent outline-none focus:border-none"
				/> */}
      {error ? <span className="text-red-400 text-[12px]">{error}</span> : null}
    </div>
  );
};

interface CustomTextareaFieldProps {
  name?: string;
  onChange?: (e: any) => unknown;
  required?: boolean;
  value?: string;
  error?: string;
  placeholder?: string;
  label?: string;
  height?: string;
  startContent?: any;
  labelPlacement?: "outside" | "outside-left" | "inside";
  rows?: number;
  disabled?: boolean;
  inputProps?: {
    onChange?: (e: any) => unknown;
    onBlur?: (e: any) => unknown;
    ref?: RefCallback<HTMLTextAreaElement>;
    name?: string;
    value?: string;
    min?: string | number;
    max?: string | number;
    maxLength?: number;
    minLength?: number;
    pattern?: string;
    required?: boolean;
    disabled?: boolean;
  };
}

export const CustomTextareaField = ({
  placeholder,
  error,
  inputProps,
  label,
  value,
  onChange,
  height = "min-h-[100px]",
  labelPlacement = "inside",
  startContent,
  required = false,
  rows = 4,
  disabled = false,
}: CustomTextareaFieldProps) => {
  const [isFocused, setIsFocused] = useState(false);

  // Determine if label should be in "floated" state
  const hasValue = value && value.length > 0;
  const shouldFloat = isFocused || hasValue || disabled;

  const handleFocus = (e: any) => {
    setIsFocused(true);
    if (inputProps?.onBlur) {
      inputProps.onBlur(e);
    }
  };

  const handleBlur = (e: any) => {
    setIsFocused(false);
    if (inputProps?.onBlur) {
      inputProps.onBlur(e);
    }
  };

  if (labelPlacement === "inside") {
    // Custom floating label implementation for inside placement
    return (
      <div className="relative">
        <div className="relative">
          {/* Custom floating label */}
          <label
            className={cn(
              "absolute left-3 transition-all duration-200 ease-in-out pointer-events-none transform origin-top-left capitalize tracking-wide z-10",
              shouldFloat
                ? "top-2 text-sm scale-75 font-normal text-muted-foreground"
                : "top-4 text-sm ml-2 text-muted-foreground",
            )}
          >
            {required ? (
              <span>
                {label} <span className="text-red-500">*</span>
              </span>
            ) : (
              label
            )}
          </label>

          {/* Textarea field */}
          <textarea
            value={value}
            onChange={(e) => {
              if (onChange) {
                onChange(e);
              }
              if (inputProps?.onChange) {
                inputProps.onChange(e);
              }
            }}
            onFocus={handleFocus}
            onBlur={handleBlur}
            disabled={disabled}
            rows={rows}
            placeholder={shouldFloat ? placeholder : ""}
            {...(inputProps ?? {})}
            className={cn(
              "w-full bg-background border border-input rounded-md resize-none",
              startContent ? "pl-9 pr-3" : "px-3",
              shouldFloat ? "pt-6 pb-2" : "py-4",
              "focus:border-primary-green focus:ring-1 focus:ring-primary-green focus:outline-none",
              "disabled:cursor-not-allowed disabled:opacity-50",
              "transition-all duration-200",
              height,
              error && "border-red-400 focus:border-red-400 focus:ring-red-400",
            )}
          />

          {/* Start content */}
          {startContent && (
            <div
              className={`absolute left-3 top-4 pointer-events-none ${shouldFloat ? "top-6" : ""}`}
            >
              {startContent}
            </div>
          )}

          {/* End content */}
          {error && (
            <div className="absolute right-3 top-4">
              <Icon
                icon="material-symbols:error-outline"
                className="text-orange-500"
              />
            </div>
          )}
        </div>

        {error && (
          <span className="text-red-400 text-xs mt-1 block">{error}</span>
        )}
      </div>
    );
  }

  // Fallback for outside label placement
  return (
    <div className="flex flex-col w-full">
      {label && (
        <label className="text-sm capitalize mb-2">
          {required ? (
            <span>
              {label} <span className="text-red-500">*</span>
            </span>
          ) : (
            label
          )}
        </label>
      )}
      <div className="relative">
        <textarea
          value={value}
          onChange={(e) => {
            if (onChange) {
              onChange(e);
            }
            if (inputProps?.onChange) {
              inputProps.onChange(e);
            }
          }}
          disabled={disabled}
          rows={rows}
          placeholder={placeholder}
          {...(inputProps ?? {})}
          className={cn(
            "w-full bg-background border border-input rounded-md resize-none px-3 py-3",
            "focus:border-primary-green focus:ring-1 focus:ring-primary-green focus:outline-none",
            "disabled:cursor-not-allowed disabled:opacity-50",
            height,
            error && "border-red-400 focus:border-red-400 focus:ring-red-400",
          )}
        />
        {error && (
          <div className="absolute right-3 top-3">
            <Icon
              icon="material-symbols:error-outline"
              className="text-orange-500"
            />
          </div>
        )}
      </div>
      {error && (
        <span className="text-red-400 text-xs mt-1 block">{error}</span>
      )}
    </div>
  );
};

interface IAutoCompleteSelectComponent {
  handleChange: (
    e: React.ChangeEvent<HTMLSelectElement | HTMLInputElement>,
  ) => void;
  item: any;
  name: any;
  className?: string;
  placeholder?: string;
  labelPlacement?: string;
  label?: string;
  type: string;
  classNames?: {
    inputWrapper?: string;
    input?: string;
    menu?: string;
    label?: string;
  };
  returnItem?: (value: any) => void;
  otherFilters?: string[];
}

export const AutoCompleteSelectComponent: React.FunctionComponent<
  IAutoCompleteSelectComponent
> = ({
  handleChange,
  name,
  type,
  placeholder = "Search.....",
  label = "",
  classNames,
  returnItem,
  otherFilters,
  labelPlacement = "outside",
}) => {
  const [inputValue, setValue] = useState("");
  const [selected, setSelected] = useState("");
  const [menu, setMenu] = useState(false);

  const wrapperRef = React.useRef<HTMLDivElement>(null);

  const TypeMap: any = {
    item: {
      url: "/stock/list/item",
      filters: ["Item", "item_name", "like"],
      order: "tabItem.creation desc",
      name: "item_name",
      value: "item_code",
    },
    supplier: {
      url: "/users/list/supplier",
      filters: ["Supplier", "supplier_name", "like"],
      order: "tabSupplier.creation desc",
      name: "supplier_name",
      value: "name",
    },
    customer: {
      url: "/users/list/customer",
      filters: ["Customer", "customer_name", "like"],
      otherFilters: [...(otherFilters || [])],
      order: "tabCustomer.creation desc",
      name: "customer_name",
      value: "name",
    },
  };

  const { data, isFetching, isLoading } = useQuery({
    queryKey: [type, inputValue],
    queryFn: async () => {
      const response = await fetch(TypeMap[type].url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          fields: ["*"],
          limit_start: 0,
          limit_page_length: 20,
          order_by: TypeMap[type].order,
          filters: [
            [...TypeMap[type].filters, `%${inputValue.split(", ")[0]}%`],
            ...[TypeMap[type].otherFilters],
          ].filter((item) => !isEmpty(item)),
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to fetch autocomplete options");
      }

      const json = await response.json();

      return json;
    },
    enabled: isEmpty(selected),
    refetchOnWindowFocus: false,
  });

  const normalizedData = data as { data?: any[] } | any[] | undefined;
  const menuItems = Array.isArray(normalizedData)
    ? normalizedData
    : normalizedData?.data || [];

  return (
    <div className="flex flex-col">
      {labelPlacement === "outside" && (
        <h1 className={`capitalize text-xs ${classNames?.label}`}>{label}</h1>
      )}
      <div
        onMouseLeave={() => {
          setMenu(false);
        }}
        className="flex flex-col w-full relative group"
      >
        <div
          ref={wrapperRef}
          className={` w-full flex flex-row relative border rounded-md border-collapse overflow-x-clip ${classNames?.inputWrapper}`}
        >
          {labelPlacement === "inside" && (
            <h1
              className={`capitalize absolute left-2 ${classNames?.label} text-[10px]`}
            >
              {label}
            </h1>
          )}

          <input
            onMouseDown={() => setMenu(true)}
            onChange={(e) => {
              setValue(e.target.value);
              handleChange(e);
              setMenu(true);
            }}
            value={inputValue}
            placeholder={placeholder}
            className={cn(
              `w-full p-2 bg-transparent rounded-md border-transparent outline-none focus:outline-transparent`,
              classNames?.input,
            )}
          />
          <div className="absolute right-1 flex flex-row top-1/2 -translate-y-1/2">
            <button
              type="button"
              onClick={() => {
                setValue("");
                setSelected("");
                handleChange({ target: { name, value: "" } } as any);
                setMenu(false);
                returnItem?.("");
              }}
              className="mx-1"
            >
              {isLoading ? (
                <Spinner size="sm" color="current" />
              ) : inputValue ? (
                <Icon icon="iconamoon:close-fill" className="text-xl" />
              ) : (
                ""
              )}
            </button>
          </div>
        </div>

        {/* menu */}
        {menu && (
          <div
            className={cn(
              `${
                (menuItems.length > 0 || isLoading) &&
                "p-1 pt-2 rounded-t-none border border-collapse"
              } w-full  bg-white shadow-lg border-t-0 rounded-b-md border-collapse absolute left-0 top-[calc(100%-6px)] z-50 max-h-[15rem] overflow-y-auto transition-all`,
              classNames?.menu,
            )}
          >
            {isFetching && (
              <p className="italic text-[12px] mx-auto text-gray-400 w-fit">
                Loading...
              </p>
            )}

            {menuItems.map((item: any, index: number) => (
              <button
                key={index}
                type="button"
                onClick={() => {
                  setValue(
                    `${item[TypeMap[type].name]}, ${item[TypeMap[type].value]}`,
                  );
                  setSelected(
                    `${item[TypeMap[type].name]}, ${item[TypeMap[type].value]}`,
                  );
                  handleChange({
                    target: { name, value: item[TypeMap[type].value] },
                  } as any);
                  returnItem?.(item);
                  setMenu(false);
                }}
                className="p-2 rounded-md text-left hover:bg-gray-300 dark:hover:bg-white hover:text-primary-black w-full flex flex-col transition-all"
              >
                <div className="text-sm font-medium">
                  {item[TypeMap[type].name]},
                  <span className="font-normal ml-1">
                    {item[TypeMap[type].value]}
                  </span>
                </div>
                <p className="text-xs font-light">{item.description}</p>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
interface SearchableSelectFieldProps {
  label?: string;
  placeholder?: string;
  isDisabled?: boolean;
  error?: string;
  labelPlacement?: "outside" | "outside-left" | "inside";
  className?: string;
  value?: string;
  options: Array<{ label: string; value: any; description?: string } | string>;
  required?: boolean;
  isLoading?: boolean;
  onValueChange?: (value: string) => void;
  onInputChange?: (value: string) => void;
  inputValue?: string;
  defaultSelectedKey?: string;
  allowsCustomValue?: boolean;
  selectProps?: {
    classNames?: Record<string, string>;
    [key: string]: any;
  };
  filterFunction?: (items: any[], inputValue: string) => any[];
  onClear?: () => void; // Add onClear prop
}

export const SearchableSelectField: FC<SearchableSelectFieldProps> = ({
  label = "",
  options,
  error,
  value,
  placeholder,
  className,
  required = false,
  isLoading = false,
  labelPlacement = "inside",
  isDisabled = false,
  onValueChange,
  onInputChange,
  inputValue,
  defaultSelectedKey,
  allowsCustomValue = false,
  selectProps,
  filterFunction,
  onClear, // Add onClear to destructured props
}) => {
  const [showMsg, setShowMsg] = useState(false);
  const [internalInputValue, setInternalInputValue] = useState("");

  // Find the selected option's label to display in input
  const selectedOption = options.find(
    (opt: any) => (typeof opt === "string" ? opt : opt?.value) === value,
  );
  const selectedLabel =
    typeof selectedOption === "string"
      ? selectedOption
      : selectedOption?.label || "";

  const currentInputValue =
    inputValue !== undefined ? inputValue : internalInputValue;
  const handleInputChange = onInputChange || setInternalInputValue;

  // Sync input value with selected value when value changes
  useEffect(() => {
    if (value && selectedLabel) {
      // Only update if input is empty or doesn't match the selected label
      const currentValue =
        inputValue !== undefined ? inputValue : internalInputValue;
      if (!currentValue || currentValue !== selectedLabel) {
        if (onInputChange) {
          onInputChange(selectedLabel);
        } else {
          setInternalInputValue(selectedLabel);
        }
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, selectedLabel]);

  // Default filter function that searches in label, value, and description
  const defaultFilter = (items: any[], inputValue: string) => {
    if (!inputValue) return items;

    const searchTerm = inputValue.toLowerCase();
    return items.filter((item: any) => {
      const itemLabel = typeof item === "string" ? item : item?.label || "";
      const itemValue =
        typeof item === "string" ? item : String(item?.value || "");
      const itemDescription =
        typeof item === "string" ? "" : item?.description || "";

      return (
        itemLabel.toLowerCase().includes(searchTerm) ||
        itemValue.toLowerCase().includes(searchTerm) ||
        itemDescription.toLowerCase().includes(searchTerm)
      );
    });
  };

  const filterFn = filterFunction || defaultFilter;
  const filteredOptions = filterFn(options, currentInputValue);

  return (
    <div>
      <Autocomplete
        variant="faded"
        size="md"
        aria-label={label}
        isDisabled={isDisabled}
        label={
          required ? (
            <span>
              {label} <span className="text-red-500">*</span>
            </span>
          ) : (
            label
          )
        }
        radius="sm"
        placeholder={placeholder}
        labelPlacement={labelPlacement}
        isLoading={isLoading}
        allowsCustomValue={allowsCustomValue}
        defaultSelectedKey={defaultSelectedKey}
        selectedKey={value}
        inputValue={currentInputValue}
        onInputChange={(val) => handleInputChange(val)}
        onSelectionChange={(key) => {
          const selectedValue = key ? String(key) : "";
          // Find the selected option and update input to show its label
          const selected = options.find(
            (opt: any) =>
              (typeof opt === "string" ? opt : opt?.value) === selectedValue,
          );
          const labelToShow =
            typeof selected === "string"
              ? selected
              : selected?.label || selectedValue;

          // Update input value to show selected label
          if (onInputChange) {
            onInputChange(labelToShow);
          } else {
            setInternalInputValue(labelToShow);
          }

          onValueChange?.(selectedValue);
        }}
        items={filteredOptions}
        classNames={{
          base: cn(
            "rounded-md bg-muted/30 border-gray-300/20",
            className,
          ),
          // inputWrapper: cn(
          //   "border dark:border-[#F5F5F580] bg-muted  rounded-md",
          //   className
          // ),
          selectorButton: cn(
            `data-[hover=true]:shadow-none shadow-none border-0 bg-transparent p-0 min-w-0 w-auto h-auto text-[12px]`,
            className,
          ),
          endContentWrapper: "bg-transparent border-0",
          popoverContent: "rounded-md",
          ...selectProps?.classNames,
        }}
        {...(selectProps
          ? Object.fromEntries(
              Object.entries(selectProps).filter(
                ([key]) => key !== "classNames",
              ),
            )
          : {})}
        endContent={
          value && onClear ? (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onClear();
                // Also clear the input value
                if (onInputChange) {
                  onInputChange("");
                } else {
                  setInternalInputValue("");
                }
              }}
              className="hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full p-1 transition-colors"
              title="Clear selection"
            >
              <Icon
                icon="iconamoon:close-fill"
                className="text-lg text-muted-foreground"
              />
            </button>
          ) : error ? (
            <Icon
              onClick={() => setShowMsg(true)}
              icon="material-symbols:error-outline"
              className=""
              color="orange"
            />
          ) : null
        }
      >
        {filteredOptions?.map((option: any) => {
          const optionValue =
            typeof option === "string" ? option : option?.value;
          const optionLabel =
            typeof option === "string" ? option : option?.label || optionValue;
          const optionDescription =
            typeof option === "string" ? undefined : option?.description;

          // Include both label and description in textValue for search
          const searchableText = optionDescription
            ? `${optionLabel} ${optionDescription}`
            : optionLabel;

          return (
            <AutocompleteItem
              key={optionValue}
              value={optionValue}
              textValue={searchableText}
            >
              <div className="flex flex-col">
                <span>{optionLabel}</span>
                {optionDescription && (
                  <span className="text-xs text-muted-foreground">
                    {optionDescription}
                  </span>
                )}
              </div>
            </AutocompleteItem>
          );
        })}
      </Autocomplete>

      {showMsg ? (
        <span className="text-red-400 text-[12px]">{error}</span>
      ) : null}
    </div>
  );
};
