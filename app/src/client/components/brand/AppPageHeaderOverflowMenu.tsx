import { Link } from "react-router";
import { MoreHorizontal } from "lucide-react";
import { cn } from "../../utils";
import { Button } from "../ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import type { PageSecondaryAction } from "../../../shared/uiPresentation";

/**
 * Mobile overflow ("more actions") menu of AppPageHeader. Lives in its own
 * module so the Radix dropdown/popper stack is loaded on demand and stays out
 * of the landing-page bundle (AppChrome is shared with public pages).
 */
export default function AppPageHeaderOverflowMenu({
  actions,
  label,
}: {
  actions: PageSecondaryAction[];
  label: string;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="outline"
          className="h-11 min-h-11 gap-1.5 rounded-md px-3"
          aria-label={label}
        >
          <MoreHorizontal className="h-4 w-4 shrink-0" aria-hidden />
          <span className="text-sm font-medium">{label}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-[12rem]">
        {actions.map((action) =>
          action.href ? (
            <DropdownMenuItem key={action.label} asChild>
              <Link
                to={action.href}
                onClick={action.onClick}
                className={cn(action.destructive && "text-destructive")}
              >
                {action.label}
              </Link>
            </DropdownMenuItem>
          ) : (
            <DropdownMenuItem
              key={action.label}
              disabled={action.disabled}
              className={cn(action.destructive && "text-destructive")}
              onClick={action.onClick}
            >
              {action.label}
            </DropdownMenuItem>
          ),
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
