import { Search } from "lucide-react";
import { Input } from "./ui/input";
import { cn } from "../utils";

interface SearchInputProps
  extends Omit<React.ComponentProps<typeof Input>, "type"> {
  containerClassName?: string;
}

export function SearchInput({
  className,
  containerClassName,
  ...props
}: SearchInputProps) {
  return (
    <div className={cn("relative flex-1 max-w-xs", containerClassName)}>
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
      <Input type="search" className={cn("h-9 pl-9", className)} {...props} />
    </div>
  );
}
