export function SuggestionDatalist({ id, options }: { id: string; options: string[] }) {
  return (
    <datalist id={id}>
      {options.map((value) => (
        <option key={value} value={value} />
      ))}
    </datalist>
  );
}
