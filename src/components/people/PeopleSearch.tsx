import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";

interface PeopleSearchProps {
  onSearch: (term: string) => void;
  placeholder?: string;
  disabled?: boolean;
}

export function PeopleSearch({ 
  onSearch, 
  placeholder = "Digite para buscar pessoas...",
  disabled = false 
}: PeopleSearchProps) {
  const [searchValue, setSearchValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const handleSearch = () => {
    if (searchValue.trim()) {
      onSearch(searchValue.trim());
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleSearch();
    }
  };

  const handleClear = () => {
    setSearchValue("");
    onSearch("");
    inputRef.current?.focus();
  };

  return (
    <div className="flex gap-2">
      <div className="relative flex-1">
        <Input
          ref={inputRef}
          value={searchValue}
          onChange={(e) => setSearchValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled}
          className="pr-8"
        />
        {searchValue && (
          <Button
            variant="ghost"
            size="sm"
            className="absolute right-1 top-1/2 -translate-y-1/2 h-6 w-6 p-0 hover:bg-transparent"
            onClick={handleClear}
          >
            ×
          </Button>
        )}
      </div>
      <Button 
        onClick={handleSearch}
        disabled={disabled || !searchValue.trim()}
        className="shrink-0"
      >
        <Search className="h-4 w-4 mr-2" />
        Buscar
      </Button>
    </div>
  );
}