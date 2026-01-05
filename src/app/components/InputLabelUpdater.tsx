`use client`;

import React, { useState } from "react";

export function InputLabelUpdater() {
  const [labelText, setLabelText] = useState("");

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const data = (event.nativeEvent as InputEvent).data;
    const value =
      (event.nativeEvent as unknown as { currentTarget?: { value?: string } })
        .currentTarget?.value ?? event.currentTarget.value;

    setLabelText(`event.data: ${String(data)} | event.nativeEvent.currentTarget.value: ${value}`);
  };

  return (
    <div>
      <label>{labelText}</label>
      <div>
        <input type="text" onChange={handleChange} />
      </div>
    </div>
  );
}

