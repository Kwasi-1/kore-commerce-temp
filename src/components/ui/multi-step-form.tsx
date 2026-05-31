import * as React from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Check } from "lucide-react";

export interface Step {
  id: string;
  title: string;
  description?: string;
  subtitle?: string;
  status?: "complete" | "current" | "incomplete";
}

interface MultiStepFormContextType {
  currentStep: number;
  totalSteps: number;
  nextStep: () => void;
  prevStep: () => void;
  goToStep: (step: number) => void;
  isFirstStep: boolean;
  isLastStep: boolean;
}

const MultiStepFormContext = React.createContext<
  MultiStepFormContextType | undefined
>(undefined);

export function useMultiStepForm() {
  const context = React.useContext(MultiStepFormContext);
  if (!context) {
    throw new Error("useMultiStepForm must be used within a MultiStepForm");
  }
  return context;
}

interface MultiStepFormProps {
  children: React.ReactNode;
  steps: Step[];
  currentStep: number;
  onStepChange: (step: number) => void;
  className?: string;
  orientation?: "horizontal" | "vertical";
  onStepClick?: (stepIndex: number) => void;
  allowClickableSteps?: boolean;
}

export function MultiStepForm({
  children,
  steps,
  currentStep,
  onStepChange,
  className,
  orientation = "horizontal",
  onStepClick,
  allowClickableSteps = false,
}: MultiStepFormProps) {
  const nextStep = () => {
    if (currentStep < steps.length - 1) {
      onStepChange(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      onStepChange(currentStep - 1);
    }
  };

  const goToStep = (step: number) => {
    if (step >= 0 && step < steps.length) {
      onStepChange(step);
    }
  };

  const handleStepClick = (index: number) => {
    if (allowClickableSteps) {
      onStepClick?.(index);
      goToStep(index);
    }
  };

  const value: MultiStepFormContextType = {
    currentStep,
    totalSteps: steps.length,
    nextStep,
    prevStep,
    goToStep,
    isFirstStep: currentStep === 0,
    isLastStep: currentStep === steps.length - 1,
  };

  const getStepStatus = (
    index: number,
  ): "complete" | "current" | "incomplete" => {
    if (index < currentStep) return "complete";
    if (index === currentStep) return "current";
    return "incomplete";
  };

  if (orientation === "vertical") {
    return (
      <MultiStepFormContext.Provider value={value}>
        <div
          className={cn("flex w-full flex-col gap-8 lg:flex-row", className)}
        >
          {/* Vertical Step Indicators */}
          <nav
            aria-label="Progress"
            className="w-full flex-shrink-0 max-w-md lg:max-w-xs"
          >
            <ol className="relative flex flex-col gap-8">
              {steps.map((step, index) => {
                const status = step.status || getStepStatus(index);
                const isClickable = allowClickableSteps;
                const isComplete = status === "complete";
                const isCurrent = status === "current";
                const isIncomplete = status === "incomplete";
                const subtitle = step.subtitle ?? step.description;
                const titleColorClass = isCurrent
                  ? "text-teal-900"
                  : isComplete
                    ? "text-foreground"
                    : "text-muted-foreground";
                const connectorColor = isComplete
                  ? "bg-teal-800"
                  : isCurrent
                    ? "bg-teal-600"
                    : "bg-gray-200";

                return (
                  <li
                    key={step.id}
                    className="relative flex gap-4 pb-8 last:pb-0"
                  >
                    {/* Connector Line */}
                    {index < steps.length - 1 && (
                      <div
                        className={cn(
                          "pointer-events-none absolute left-6 top-12 w-0.5 rounded-full transition-colors duration-300",
                          connectorColor,
                        )}
                        style={{ height: "calc(200% - 3rem)" }}
                        aria-hidden="true"
                      />
                    )}

                    {/* Step Content */}
                    <div
                      className={cn(
                        "flex flex-1 items-start gap-4",
                        isClickable && "cursor-pointer",
                      )}
                      onClick={() => handleStepClick(index)}
                      onKeyDown={(e) => {
                        if (
                          isClickable &&
                          (e.key === "Enter" || e.key === " ")
                        ) {
                          e.preventDefault();
                          handleStepClick(index);
                        }
                      }}
                      role={isClickable ? "button" : undefined}
                      tabIndex={isClickable ? 0 : undefined}
                      aria-current={isCurrent ? "step" : undefined}
                    >
                      {/* Step Circle */}
                      <div className="relative flex-shrink-0 self-start">
                        <div
                          className={cn(
                            "flex h-12 w-12 items-center justify-center rounded-full text-base font-semibold transition-all duration-300",
                            isComplete && "bg-teal-800 text-white shadow-sm",
                            isCurrent && "bg-teal-700 text-white shadow-lg",
                            isIncomplete &&
                              "border-2 border-gray-300 bg-white text-gray-400",
                          )}
                        >
                          {isComplete ? (
                            <Check
                              className="h-5 w-5"
                              strokeWidth={3}
                              aria-hidden="true"
                            />
                          ) : (
                            <span className={cn(isCurrent && "font-bold")}>
                              {index + 1}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Step Text */}
                      <div className="min-w-0 flex-1">
                        <p
                          className={cn(
                            "text-sm font-semibold leading-tight",
                            titleColorClass,
                          )}
                        >
                          {step.title}
                        </p>
                        {subtitle && (
                          <p className="mt-1 text-sm leading-snug text-muted-foreground">
                            {subtitle}
                          </p>
                        )}
                      </div>
                    </div>
                  </li>
                );
              })}
            </ol>
          </nav>

          {/* Form Content */}
          <div className="flex-1 min-h-[400px]">{children}</div>
        </div>
      </MultiStepFormContext.Provider>
    );
  }

  return (
    <MultiStepFormContext.Provider value={value}>
      <div className={cn("w-full flex flex-col items-center", className)}>
        {/* Horizontal Step Indicators */}
        <nav aria-label="Progress" className="mb-12 w-full">
          <ol className="flex items-start justify-center max-w-3xl mx-auto">
            {steps.map((step, index) => {
              const status = step.status || getStepStatus(index);
              const isClickable = allowClickableSteps;
              const isComplete = status === "complete";
              const isCurrent = status === "current";
              const isIncomplete = status === "incomplete";
              const subtitle = step.subtitle ?? step.description;

              return (
                <React.Fragment key={step.id}>
                  <li className="flex flex-col items-center flex-1 min-w-[160px] max-w-[200px]">
                    <div
                      className={cn(
                        "flex flex-col items-center",
                        isClickable && "cursor-pointer group",
                      )}
                      onClick={() => handleStepClick(index)}
                      onKeyDown={(e) => {
                        if (
                          isClickable &&
                          (e.key === "Enter" || e.key === " ")
                        ) {
                          e.preventDefault();
                          handleStepClick(index);
                        }
                      }}
                      role={isClickable ? "button" : undefined}
                      tabIndex={isClickable ? 0 : undefined}
                      aria-current={isCurrent ? "step" : undefined}
                    >
                      {/* Step Circle */}
                      <div
                        className={cn(
                          "flex h-12 w-12 items-center justify-center rounded-full transition-all duration-300",
                          isComplete && "bg-teal-700 text-white shadow-sm",
                          isCurrent &&
                            "bg-teal-700 text-white shadow-lg ring-4 ring-teal-700",
                          isIncomplete &&
                            "border-2 border-gray-300 bg-white text-gray-400",
                        )}
                      >
                        {isComplete ? (
                          <Check className="h-5 w-5" strokeWidth={3} />
                        ) : (
                          <span
                            className={cn(
                              "text-base font-semibold",
                              isCurrent && "font-bold",
                            )}
                          >
                            {index + 1}
                          </span>
                        )}
                      </div>

                      {/* Step Text */}
                      <div className="mt-3 text-center px-2">
                        <p
                          className={cn(
                            "text-sm font-semibold",
                            isCurrent && "text-foreground font-bold",
                            isComplete && "text-foreground",
                            isIncomplete && "text-muted-foreground",
                          )}
                        >
                          {step.title}
                        </p>
                        {subtitle && (
                          <p className="text-xs text-muted-foreground mt-1">
                            {subtitle}
                          </p>
                        )}
                      </div>
                    </div>
                  </li>

                  {/* Connector Line */}
                  {index < steps.length - 1 && (
                    <div className="flex items-center pt-6 flex-shrink-0 px-2">
                      <div
                        className={cn(
                          "h-0.5 w-16 transition-all duration-300",
                          isComplete ? "bg-teal-700" : "bg-gray-300",
                        )}
                        aria-hidden="true"
                      />
                    </div>
                  )}
                </React.Fragment>
              );
            })}
          </ol>
        </nav>

        {/* Form Content */}
        <div className="w-full min-h-[400px]">{children}</div>
      </div>
    </MultiStepFormContext.Provider>
  );
}

interface MultiStepFormNavigationProps {
  onSubmit?: () => void;
  submitLabel?: string;
  nextLabel?: string;
  prevLabel?: string;
  className?: string;
}

export function MultiStepFormNavigation({
  onSubmit,
  submitLabel = "Submit",
  nextLabel = "Next",
  prevLabel = "Previous",
  className,
}: MultiStepFormNavigationProps) {
  const { nextStep, prevStep, isFirstStep, isLastStep } = useMultiStepForm();

  return (
    <div
      className={cn(
        "flex items-center justify-between border-t pt-6 mt-8 bg-white rounded-lg px-6 py-4 shadow-sm",
        className,
      )}
    >
      <Button
        type="button"
        variant="outline"
        onClick={prevStep}
        disabled={isFirstStep}
        className="min-w-[100px]"
      >
        {prevLabel}
      </Button>

      <div className="flex gap-2">
        {!isLastStep ? (
          <Button type="button" onClick={nextStep} className="min-w-[100px]">
            {nextLabel}
          </Button>
        ) : (
          <Button type="button" onClick={onSubmit} className="min-w-[120px]">
            {submitLabel}
          </Button>
        )}
      </div>
    </div>
  );
}
