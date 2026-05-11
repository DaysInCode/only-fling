"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { apiGet } from "@/lib/api";

type Item = {
  id: string;
  title: string;
  description: string;
  priceMinor: number;
  currency: string;
  type: string;
};

export default function MarketplacePage() {
  const [items, setItems] = useState<Item[]>([]);
  const [platformFee, setPlatformFee] = useState<number>(12);

  useEffect(() => {
    apiGet<{ items: Item[]; commission: { platformFeePercent: number } }>("/items").then((result) => {
      if (result.data) {
        setItems(result.data.items);
        setPlatformFee(result.data.commission.platformFeePercent);
      }
    });
  }, []);

  return (
    <main className="shell section">
      <nav className="nav">
        <div className="brand">OnlyFling Starter</div>
        <div className="navLinks">
          <Link href="/">Home</Link>
          <Link href="/dashboard">Dashboard</Link>
          <Link href="/onboarding">Onboarding</Link>
        </div>
      </nav>

      <section className="pageGrid">
        <div className="heroCard">
          <div className="eyebrow">Marketplace + commission engine</div>
          <h1 className="heroTitle">Sell offers through a simple commission-first storefront.</h1>
          <p className="heroLead">
            The starter supports free and paid accounts, item sales, future Stripe checkout sessions, and a default
            platform fee of {platformFee}%.
          </p>
        </div>
        <div className="panel">
          <div className="label">Pricing model</div>
          <ul className="list">
            <li>Free plan: basic storefront, uploads, one invite track</li>
            <li>Pro plan: analytics, connector installs, better reward multipliers</li>
            <li>Platform revenue: commission on transactions and plan upgrades</li>
          </ul>
        </div>
      </section>

      <section className="section cardGrid">
        {items.map((item) => (
          <article key={item.id} className="card">
            <div className="label">{item.type}</div>
            <h2>{item.title}</h2>
            <p className="muted">{item.description}</p>
            <strong style={{ marginTop: 16, display: "block" }}>
              {item.currency} {(item.priceMinor / 100).toFixed(2)}
            </strong>
          </article>
        ))}
      </section>
    </main>
  );
}
