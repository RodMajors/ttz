"use client";

import { useQuery } from "@tanstack/react-query";
import { type CharacterSummary, characterSearchResultsSchema } from "@ttz/contracts";
import { Check, ChevronsUpDown, X } from "lucide-react";
import { useState } from "react";
import { GameIcon } from "@/components/game-icon";
import { Button } from "@/components/ui/button";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { apiRequest } from "@/lib/api-client";

export type CharacterPickerSelection = { memberName: string; character: CharacterSummary };

export function CharacterPicker({
  id,
  value,
  initialSelection = null,
  onChange,
}: {
  id: string;
  value: string | null;
  initialSelection?: CharacterPickerSelection | null;
  onChange: (value: CharacterPickerSelection | null) => void;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [selection, setSelection] = useState<CharacterPickerSelection | null>(null);
  const query = useQuery({
    queryKey: ["characters", "search", search.trim()],
    queryFn: () =>
      apiRequest(`/characters/search?search=${encodeURIComponent(search.trim())}`, characterSearchResultsSchema),
    enabled: open && search.trim().length > 0,
    staleTime: 15_000,
  });
  const selected = value
    ? selection?.character.id === value
      ? selection
      : initialSelection?.character.id === value
        ? initialSelection
        : null
    : null;
  const label = selected
    ? `${selected.character.name} · ${selected.character.realm} · ${selected.memberName}`
    : "搜索邀请角色";

  function choose(result: CharacterPickerSelection | null) {
    setSelection(result);
    onChange(result);
    setOpen(false);
    setSearch("");
  }

  return (
    <div className="flex min-w-0 gap-2">
      <input type="hidden" name="inviterId" value={value ?? ""} />
      <Popover
        open={open}
        onOpenChange={(next) => {
          setOpen(next);
          if (!next) setSearch("");
        }}
      >
        <PopoverTrigger asChild>
          <Button
            id={id}
            type="button"
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="min-w-0 flex-1 justify-between font-normal cursor-pointer"
          >
            <span className="truncate">{label}</span>
            <ChevronsUpDown className="ml-2 size-4 shrink-0 text-muted-foreground" />
          </Button>
        </PopoverTrigger>
        <PopoverContent align="start" className="w-[min(24rem,calc(100vw-2rem))] p-0">
          <Command shouldFilter={false}>
            <CommandInput autoFocus value={search} onValueChange={setSearch} placeholder="输入角色名、服务器或成员名" />
            <CommandList>
              {!search.trim() ? <CommandEmpty>输入关键词以搜索公会角色。</CommandEmpty> : null}
              {query.isFetching ? (
                <div className="px-3 py-5 text-center text-sm text-muted-foreground">搜索中…</div>
              ) : null}
              {query.isError ? (
                <div role="alert" className="px-3 py-5 text-center text-sm text-destructive">
                  {query.error.message}
                </div>
              ) : null}
              {search.trim() && !query.isFetching && query.data?.length === 0 ? (
                <CommandEmpty>没有找到匹配的角色。</CommandEmpty>
              ) : null}
              {query.data?.length ? (
                <CommandGroup heading="公会角色">
                  {query.data.map((result) => {
                    const character = result.character;
                    const isSelected = character.id === value;
                    return (
                      <CommandItem
                        key={character.id}
                        value={character.id}
                        onSelect={() => choose(result)}
                        className="cursor-pointer"
                      >
                        <GameIcon src={character.classIconUrl} className="size-7 rounded object-cover" />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate font-medium">
                            {character.name} · {character.realm}
                          </span>
                          <span className="block truncate text-xs text-muted-foreground">
                            {result.memberName} · {character.className}
                            {character.activeSpecName ? ` · ${character.activeSpecName}` : ""}
                          </span>
                        </span>
                        {isSelected ? <Check className="size-4 text-primary" /> : null}
                      </CommandItem>
                    );
                  })}
                </CommandGroup>
              ) : null}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
      {value ? (
        <Button type="button" size="icon" variant="ghost" aria-label="清除邀请角色" onClick={() => choose(null)}>
          <X />
        </Button>
      ) : null}
    </div>
  );
}
