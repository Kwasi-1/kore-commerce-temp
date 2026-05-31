import { useState } from "react";
import CustomContainerComponent from "@/components/shared/custom.container.component";
import LogoComponent from "@/components/shared/logo.component";
import { Icon } from "@iconify/react/dist/iconify.js";

interface Stat {
  label: string;
  value: string | number | React.ReactElement;
  icon?: string;
  bottomText?: string;
  bottomTextColor?: string;
}

interface DashboardProps {
  stats: Stat[];
  isLoading: boolean;
}

const Dashboard: React.FC<DashboardProps> = ({ stats, isLoading }) => {
  const [isVisible, setIsVisible] = useState(false);

  // Check if a value is a React element (result of parseToMoney)
  const isMonetaryValue = (value: any): boolean => {
    return typeof value === "object" && value?.type === "span";
  };
  const getGridCols = (count: number) => {
    switch (count) {
      case 1:
        return "grid-cols-1";
      case 2:
        return "grid-cols-1 md:grid-cols-2";
      case 3:
        return "grid-cols-1 md:grid-cols-3";
      case 4:
        return "grid-cols-1 md:grid-cols-2 lg:grid-cols-4";
      case 5:
        return "grid-cols-1 md:grid-cols-3 lg:grid-cols-5";
      case 6:
        return "grid-cols-1 md:grid-cols-3 lg:grid-cols-6";
      default:
        return "grid-cols-1 md:grid-cols-2 lg:grid-cols-4";
    }
  };

  return (
    <div>
      {isLoading ? (
        <CustomContainerComponent
          headerStyles="font-semibold text-[14px]"
          styles="flex flex-col min-h-[120px] px-6"
        >
          <LogoComponent />
        </CustomContainerComponent>
      ) : (
        <div className={`grid ${getGridCols(stats.length)} gap-3`}>
          {stats.map((stat, index) => (
            <div
              key={index}
              className="relative overflow-hidden bg-white/60 backdrop-blur-md border border-white/50 shadow-[0_8px_30px_rgb(0,0,0,0.04)] p-5 w-full flex flex-col transition-all hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)]"
            >
              <div className="flex flex-col h-full min-h-[80px]">
                {/* ── Middle Row: Title & Value ─────────────────────────────────────── */}
                <div className="flex justify-between items-end gap-4 mb-2 relative z-10 flex-1">
                  <div className="flex flex-col gap-6 z-10 w-full">
                    <p className="text-[13px] font-medium text-muted-foreground">
                      {stat.label}
                    </p>
                    <div className="flex items-center justify-between">
                      <div className="text-[28px] md:text-3xl font-semibold text-foreground tracking-tight leading-none whitespace-nowrap">
                        {isMonetaryValue(stat.value) ? (
                          isVisible ? (
                            stat.value
                          ) : (
                            <span className="flex items-center gap-3 select-none text-gray-400">
                              <span className="text-3xl mt-4">
                                {" "}
                                *<span className="text-md pb-6">.</span>**
                              </span>
                            </span>
                          )
                        ) : (
                          stat.value
                        )}
                      </div>
                      {isMonetaryValue(stat.value) && (
                        <button
                          onClick={() => setIsVisible(!isVisible)}
                          className="ml-3 p-1.5 hover:bg-gray-100 rounded-full transition-colors"
                          aria-label={isVisible ? "Hide amount" : "Show amount"}
                        >
                          <Icon
                            icon={
                              isVisible
                                ? "mdi:eye-outline"
                                : "mdi:eye-off-outline"
                            }
                            className="text-lg text-gray-400 hover:text-gray-700"
                          />
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* ── Bottom Row: Trend % + Context ───────────────────────────── */}
                {stat.bottomText && (
                  <div className="flex items-center gap-2 mt-auto relative z-10">
                    <span
                      className={`text-[12px] font-medium ${stat.bottomTextColor || "text-gray-400"}`}
                    >
                      {stat.bottomText}
                    </span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Dashboard;
