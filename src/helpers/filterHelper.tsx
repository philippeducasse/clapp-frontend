import { FilterType } from "@/interfaces/forms/ControlledFormElementType";
import { FilterConfig } from "@/interfaces/table/FilterCongig";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Column } from "@tanstack/react-table";
import { Switch } from "@/components/ui/switch";
import { MultiSelect } from "@/components/ui/multi-select";

export const getFilterInput = <TData,>(
  filterConfig: FilterConfig,
  value: string | string[] | boolean,
  column: Column<TData>,
) => {
  const renderInput = () => {
    switch (filterConfig.type) {
      case FilterType.SELECT:
        return filterConfig.options ? (
          <Select
            value={typeof value === "string" ? value : ""}
            onValueChange={(event) => column?.setFilterValue(event || undefined)}
          >
            <SelectTrigger>
              <SelectValue placeholder={`Select ${filterConfig.label}`} />
            </SelectTrigger>
            <SelectContent>
              {filterConfig.options.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : null;

      case FilterType.MULTI_SELECT:
        return filterConfig.options ? (
          <MultiSelect
            options={filterConfig.options}
            defaultValue={Array.isArray(value) ? value : []}
            onValueChange={(values) => {
              column?.setFilterValue(values.length > 0 ? values : undefined);
            }}
          />
        ) : null;

      case FilterType.NUMBER:
        return (
          <Input
            type="number"
            value={typeof value === "string" ? value : ""}
            onChange={(event) => column?.setFilterValue(event || undefined)}
            placeholder={`Enter ${filterConfig.label.toLowerCase()}`}
          />
        );

      case FilterType.DATE:
        return (
          <Input
            type="date"
            value={typeof value === "string" ? value : ""}
            onChange={(event) => column?.setFilterValue(event || undefined)}
            placeholder={filterConfig.label}
          />
        );
      case FilterType.BOOLEAN:
        return (
          <Switch
            checked={value === true}
            onCheckedChange={(checked) => {
              column?.setFilterValue(checked ? true : undefined);
            }}
          />
        );

      case FilterType.TEXT:
      default:
        return (
          <Input
            type="text"
            value={typeof value === "string" ? value : ""}
            onChange={(event) => column?.setFilterValue(event || undefined)}
            placeholder={`Search ${filterConfig.label.toLowerCase()}`}
          />
        );
    }
  };

  const input = renderInput();
  if (!input) return null;

  return (
    <div className="grid gap-2 w-full">
      <Label className="text-primary">{filterConfig.label}</Label>
      {input}
    </div>
  );
};
