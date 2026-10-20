import { SearchIcon } from "./icons";

/** 목록 화면에서 검색어를 입력받는 둥근 입력란입니다. className으로는 너비와 자리만 정합니다. */
export function SearchField({
  label,
  placeholder,
  value,
  onChange,
  className,
}: {
  label: string;
  placeholder: string;
  value: string;
  onChange: (value: string) => void;
  className: string;
}) {
  return (
    <label className={`input input-sm rounded-full ${className}`}>
      <SearchIcon width={15} height={15} className="text-base-content/40" />
      <input
        type="search"
        className="grow"
        placeholder={placeholder}
        aria-label={label}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  );
}
