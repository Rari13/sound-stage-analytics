import * as React from "react";
import { cn } from "@/lib/utils";
import { Check, AlertCircle } from "lucide-react";

export interface FloatingInputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  valid?: boolean;
}

const FloatingInput = React.forwardRef<HTMLInputElement, FloatingInputProps>(
  ({ className, label, error, valid, type = "text", id, ...props }, ref) => {
    const inputId = id || label.toLowerCase().replace(/\s+/g, "-");
    const [isFocused, setIsFocused] = React.useState(false);
    const [hasValue, setHasValue] = React.useState(false);

    const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
      setIsFocused(true);
      props.onFocus?.(e);
    };

    const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
      setIsFocused(false);
      setHasValue(e.target.value.length > 0);
      props.onBlur?.(e);
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      setHasValue(e.target.value.length > 0);
      props.onChange?.(e);
    };

    const isActive = isFocused || hasValue || !!props.value || !!props.defaultValue;

    return (
      <div className="space-y-1.5">
        <div className="relative">
          <input
            type={type}
            id={inputId}
            ref={ref}
            placeholder=" "
            className={cn(
              "peer w-full h-14 px-4 pt-5 pb-2 text-base bg-background border rounded-xl",
              "focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent",
              "transition-all duration-200 ease-out",
              error
                ? "border-destructive focus:ring-destructive"
                : valid
                ? "border-success focus:ring-success"
                : "border-border",
              className
            )}
            onFocus={handleFocus}
            onBlur={handleBlur}
            onChange={handleChange}
            {...props}
          />
          <label
            htmlFor={inputId}
            className={cn(
              "absolute left-4 transition-all duration-200 ease-out pointer-events-none",
              "text-muted-foreground",
              isActive
                ? "top-2 text-xs"
                : "top-1/2 -translate-y-1/2 text-base",
              isFocused && !error && !valid && "text-primary",
              error && "text-destructive",
              valid && "text-success"
            )}
          >
            {label}
          </label>
          
          {/* Validation icons */}
          {(valid || error) && (
            <div className="absolute right-4 top-1/2 -translate-y-1/2">
              {valid && !error && (
                <Check className="h-5 w-5 text-success animate-check" />
              )}
              {error && (
                <AlertCircle className="h-5 w-5 text-destructive" />
              )}
            </div>
          )}
        </div>
        
        {/* Error message */}
        {error && (
          <p className="text-sm text-destructive px-1 animate-slide-in-bottom">
            {error}
          </p>
        )}
      </div>
    );
  }
);

FloatingInput.displayName = "FloatingInput";

export { FloatingInput };
