import { clsx, type ClassValue } from "clsx";
import { extendTailwindMerge, twMerge } from "tailwind-merge";

const customTwMerge = extendTailwindMerge({
  extend: {
    classGroups: {
      "font-size": [
        "text-overline",
        "text-caption",
        "text-body",
        "text-body-sm",
        "text-body-xs",
        "text-body-lg",
        "text-title-xxl",
        "text-title-xl",
        "text-title-xl2",
        "text-title-lg",
        "text-title-md",
        "text-title-md2",
        "text-title-sm",
        "text-title-xsm",
      ],
    },
  },
});

export function cn(...inputs: ClassValue[]) {
  return customTwMerge(clsx(inputs));
}
