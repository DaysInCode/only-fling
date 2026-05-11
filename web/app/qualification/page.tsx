"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { apiGet, getStoredToken } from "@/lib/api";

type Rule = {
  id: string;
  title: string;
  status: string;
};

export default function QualificationPage() {
  const [rules, setRules] = useState<Rule[]>([]);
  const [outcomes, setOutcomes] = useState<string[]>([]);

  useEffect(() => {
    apiGet<{ rules: Rule[]; outcomeStates: string[] }>("/qualification/rules", getStoredToken()).then((result) => {
      if (result.data) {
        setRules(result.data.rules);
        setOutcomes(result.data.outcomeStates);
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
          <Link href="/admin">Admin</Link>
        </div>
      </nav>

      <section className="pageGrid">
        <div className="heroCard">
          <div className="eyebrow">Upload analysis + qualification</div>
          <h1 className="heroTitle">Every upload passes a qualification set before it can move forward.</h1>
          <p className="heroLead">
            The starter keeps the qualification pipeline simple: policy bundle, adult-only declaration, rights check,
            profile completeness, and manual moderation when needed.
          </p>
        </div>
        <div className="panel">
          <div className="label">Outcome states</div>
          <ul className="list">
            {outcomes.map((outcome) => (
              <li key={outcome}>{outcome}</li>
            ))}
          </ul>
        </div>
      </section>

      <section className="section cardGrid">
        {rules.map((rule) => (
          <article className="card" key={rule.id}>
            <div className="label">{rule.status}</div>
            <h2>{rule.title}</h2>
          </article>
        ))}
      </section>
    </main>
  );
}
