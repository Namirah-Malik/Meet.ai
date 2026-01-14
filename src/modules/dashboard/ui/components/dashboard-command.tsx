import { CommandDialog, CommandInput, CommandList, CommandItem } from "@/components/ui/command";
import { Dispatch, SetStateAction } from "react";

interface Props {
  open: boolean;
  setOpen: Dispatch<SetStateAction<boolean>>;
}

export const DashboardCommand = ({ open, setOpen }: Props) => {
  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <div className="flex items-center gap-2 border-b px-3 py-2">
        <span className="text-sm text-slate-500">🔍</span>
        <CommandInput
          placeholder="Find a meeting or agent"
          className="border-0 focus:outline-none"
        />
      </div>
      <CommandList>
        <CommandItem className="px-3 py-2">
          Test
        </CommandItem>
      </CommandList>
    </CommandDialog>
  );
};