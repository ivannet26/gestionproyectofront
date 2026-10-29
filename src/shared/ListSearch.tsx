import { useState } from "react";

export default function ListSearch({ label, onSearch, value }: { label: string; value: string; onSearch: (value: string) => void }) {
  const [text, setText] = useState(value);
  return <form className="my-2 flex flex-wrap gap-2" onSubmit={(event) => { event.preventDefault(); onSearch(text.trim()); }}>
    <input type="search" aria-label={label} name="search" value={text} onChange={(event) => setText(event.target.value)} maxLength={100}
      className="min-w-0 flex-1 rounded-lg border border-neutral-200 bg-white px-3 py-1.5 text-xs text-neutral-800 placeholder:text-neutral-600 focus:border-neutral-400 focus:outline-none" />
    <button type="submit" className="cursor-pointer rounded-lg border border-neutral-200 bg-white px-3 py-1.5 text-xs text-neutral-800 hover:bg-neutral-100">Buscar</button>
  </form>;
}
