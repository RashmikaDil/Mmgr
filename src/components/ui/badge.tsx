import * as React from "react";
import { cn } from "@/lib/utils";

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "secondary" | "destructive" | "outline";
}

const badgeVariants = (variant: BadgeProps["variant"]) => {
  switch (variant) {
    case "secondary":
      return "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-100";
    case "destructive":
      return "bg-red-500 text-white";
    case "outline":
      return "border border-gray-300 dark:border-gray-600 text-gray-800 dark:text-gray-100";
    case "default":
    default:
      return "bg-blue-500 text-white";
  }
};

export const Badge = React.forwardRef<HTMLDivElement, BadgeProps>(
  ({ className, variant = "default", children, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        "inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold",
        badgeVariants(variant),
        className,
      )}
      {...props}
    >
      {children}
    </div>
  ),
);

Badge.displayName = "Badge";
