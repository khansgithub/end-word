"use client";

import { useEffect, useRef, useState } from "react";
import type { DictionaryEntry } from "@/shared/types";

export default function Definitions({
  definition,
}: {
  definition: DictionaryEntry | null;
}) {
  const definitions = useRef(new Map<string, DictionaryEntry>());
  const [, setDefCount] = useState(0);

  useEffect(() => {
    if (!definition) return;
    definitions.current.set(definition.key, definition);
    setDefCount((c) => c + 1);
  }, [definition]);

  return (
    <div className="panel flex flex-col w-full p-0! h-full overflow-x-hidden overflow-y-scroll">
      <div className="flex-1 w-full overflow-y-scroll">
        <table className="table p-0!#">
          <thead>
            <tr>
              <th className="p-3!">
                <p className="text-xs">Word</p>
              </th>
              <th className="p-3!">
                <p className="text-xs">Definition</p>
              </th>
            </tr>
          </thead>
          <tbody>
            {Array.from(definitions.current)
              .reverse()
              .map(([k, v], i) => (
                <tr key={k} className={i === 0 ? "bg-gray-800" : ""}>
                  <td>
                    <p className="text-xs">{k}</p>
                  </td>
                  <td>
                    <p className="text-xs">{v.data[0]?.definition ?? ""}</p>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
