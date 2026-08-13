import { useTheme } from "@/contexts/ThemeContext";
import { Check, Monitor, Moon, Sun } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";

const themeOptions = [
  { value: "light" as const, label: "ღია რეჟიმი", icon: Sun },
  { value: "dark" as const, label: "მუქი რეჟიმი", icon: Moon },
  { value: "system" as const, label: "სისტემის რეჟიმი", icon: Monitor },
];

export function ThemeSelector({ className = "" }: { className?: string }) {
  const { theme, setTheme } = useTheme();
  const current = themeOptions.find((option) => option.value === theme) ?? themeOptions[0];
  const CurrentIcon = current.icon;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className={`inline-flex size-10 items-center justify-center rounded-xl border border-border bg-card text-muted-foreground shadow-sm transition-[background-color,color,transform] duration-200 hover:bg-accent hover:text-accent-foreground active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${className}`}
          aria-label={`თემა: ${current.label}`}
        >
          <CurrentIcon className="size-[18px]" aria-hidden="true" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-52">
        <DropdownMenuLabel>გარეგნობა</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {themeOptions.map((option) => {
          const Icon = option.icon;
          return (
            <DropdownMenuItem key={option.value} onClick={() => setTheme(option.value)} className="min-h-10">
              <Icon className="mr-2 size-4" aria-hidden="true" />
              <span>{option.label}</span>
              {theme === option.value && <Check className="ml-auto size-4 text-primary" aria-label="არჩეულია" />}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
