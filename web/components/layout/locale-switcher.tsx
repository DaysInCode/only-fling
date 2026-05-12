"use client";

import { useLocale, type Locale } from "@/components/providers/locale-provider";

export function LocaleSwitcher() {
  const { locale, setLocale, messages } = useLocale();

  return (
    <label className="field" style={{ minWidth: 160 }}>
      <span className="srOnly">{messages.locale.label}</span>
      <select
        className="select"
        aria-label={messages.locale.label}
        value={locale}
        onChange={(event) => setLocale(event.target.value as Locale)}
      >
        <option value="en">{messages.locale.options.en}</option>
        <option value="de">{messages.locale.options.de}</option>
        <option value="zh-CN">{messages.locale.options["zh-CN"]}</option>
      </select>
    </label>
  );
}
