"use client";

interface DatePickerProps {
  date: Date;
  onChange: (date: Date) => void;
}

export function DatePicker({ date, onChange }: DatePickerProps) {
  const formatDate = (d: Date) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newDate = new Date(e.target.value + "T00:00:00");
    if (!isNaN(newDate.getTime())) {
      onChange(newDate);
    }
  };

  return (
    <input
      type="date"
      value={formatDate(date)}
      onChange={handleChange}
      style={{
        background: "var(--surface)",
        border: "1px solid var(--border)",
        borderRadius: 4,
        padding: "8px 12px",
        fontFamily: "var(--font-mono)",
        fontSize: 13,
        color: "var(--text-primary)",
        cursor: "pointer",
      }}
    />
  );
}
