import { cn } from "@/lib/utils";
import { Icon } from "@iconify/react/dist/iconify.js";

interface IStatusText {
  text: string;
  textClassName?: string;
}

const StatusText = ({ text, textClassName = "" }: IStatusText) => {
  const scheme = (status: string) => {
    return [
      "completed",
      "closed",
      "success",
      "successful",
      "active",
      "transferred",
      "paid",
      "approved",
      "booked",
      "actioned",
      "submitted",
      "on-time",
      "early",
      "scheduled",
      "low",
    ].includes(status.toLowerCase())
      ? {
          icon: "ic:round-check-circle",
          color: "text-primary-green bg-primary-gray border-green-500",
        }
      : [
          "cancelled",
          "failed",
          "inactive",
          "returned",
          "return",
          "rejected",
          "overdue",
          "late",
          "high",
        ].includes(status.toLowerCase())
      ? {
          icon: "jam:close-circle-f",
          color: "text-red-500 bg-red-200/10 border-red-500",
        }
      : [
          "commented",
          "in_progress",
          "partly paid",
          "partially ordered",
          "consolidated",
        ].includes(status.toLowerCase())
      ? {
          icon: "ic:round-check-circle",
          color: "text-sky-500 bg-sky-200/10 border-sky-500",
        }
      : {
          icon: "ph:warning-circle-fill",
          color: "text-amber-500 bg-amber-200/10 border-amber-500",
        };
  };

  return text ? (
    <div
      className={`flex flex-row gap-x-1 items-center ${
        scheme(text).color
      } pl-2 pr-4 rounded-full w-fit h-fit capitalize`}
    >
      <Icon icon={scheme(text).icon} />
      <p className={cn(textClassName)}>
        {String(text).replace(/_/g, " ")}
      </p>
    </div>
  ) : (
    <p>-</p>
  );
};

export default StatusText;
