// src/Comparator.tsx
import React, { useState } from "react";
import { useMutation, useQuery } from "convex/react";

type CompareResponse = {
  attributes: {
    a: any;
    b: any;
  };
  pros: { a: string[]; b: string[] };
  cons: { a: string[]; b: string[] };
  scores: { a: number; b: number };
  recommendation: string;
  explainers: { a: string; b: string };
  source?: string;
  endpoint?: string | null;
};

export default function Comparator({ apiBase }: { apiBase: string }) {
  const [a, setA] = useState(
    "2-bed condo in Nimman, 65 sqm, 2 baths, price 3.2M THB, near cafes"
  );
  const [b, setB] = useState(
    "3-bed house in Hang Dong, 120 sqm, 2 baths, garden, price 5M THB, near school"
  );
  const [goal, setGoal] = useState("investment");
  const [horizon, setHorizon] = useState("medium");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<CompareResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showDebug, setShowDebug] = useState(false);

  // --- Convex mutation for saving comparisons ---
  const saveComparison = useMutation("saveComparison");
  // optional: show a small recent list (auto-updates if using same deployment)
  
  const [saving, setSaving] = useState(false);
  const [saveResult, setSaveResult] = useState<any>(null);

  async function handleCompare() {
    setError(null);
    setResult(null);
    setLoading(true);
    try {
      const resp = await fetch(`${apiBase || "http://localhost:3000"}/api/compare-properties`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ a, b, preferences: { goal, time_horizon: horizon } }),
      });
      const json = await resp.json();
      if (!resp.ok) {
        setError(json?.error || "Comparison failed");
        if (json?.fallback) {
          setResult(json.fallback);
        }
      } else {
        setResult(json as CompareResponse);
      }
    } catch (err: any) {
      setError(String(err));
    } finally {
      setLoading(false);
    }
  }

  async function handleSaveHardcoded() {
    setSaving(true);
    setSaveResult(null);

    try {
      // Build doc from result if present, otherwise from raw inputs
      const doc = result
        ? {
            aText: a,
            bText: b,
            attributes: result.attributes,
            pros: result.pros,
            cons: result.cons,
            scores: result.scores,
            recommendation: result.recommendation,
            explainers: result.explainers,
            source: result.source || "frontend",
          }
        : {
            aText: a,
            bText: b,
            attributes: {
              a: { price: null, size_sqm: null, beds: null, baths: null, type: null, location_summary: null, features: [] },
              b: { price: null, size_sqm: null, beds: null, baths: null, type: null, location_summary: null, features: [] },
            },
            pros: { a: [], b: [] },
            cons: { a: [], b: [] },
            scores: { a: 50, b: 50 },
            recommendation: "No result - saved raw input",
            explainers: { a: "", b: "" },
            source: "frontend-raw",
          };

      // debug: show what we are sending
      console.log("Calling convex.saveComparison with doc:", doc);

      const saved = await saveComparison(doc);
      console.log("Convex saved (client):", saved);
      setSaveResult(saved || { ok: true, id: saved?._id ?? saved?.id ?? saved });
    } catch (e: any) {
      console.error("saveComparison error (client):", e);
      setSaveResult({ error: String(e) });
    } finally {
      setSaving(false);
    }
  }

  function renderAttributesRow(label: string, key: string) {
    const left = result?.attributes?.a?.[key];
    const right = result?.attributes?.b?.[key];
    return (
      <tr>
        <td className="attr-label">{label}</td>
        <td className="attr-val">{left ?? "-"}</td>
        <td className="attr-val">{right ?? "-"}</td>
      </tr>
    );
  }

  function pct(n?: number) {
    if (typeof n !== "number") return 0;
    return Math.max(0, Math.min(100, Math.round(n)));
  }

  return (
    <div>
      <h2 className="title">Property Comparator</h2>

      <div className="block two-cols">
        <div>
          <label className="label">Listing A</label>
          <textarea
            value={a}
            onChange={(e) => setA(e.target.value)}
            rows={6}
            className="input textarea"
          />
        </div>

        <div>
          <label className="label">Listing B</label>
          <textarea
            value={b}
            onChange={(e) => setB(e.target.value)}
            rows={6}
            className="input textarea"
          />
        </div>
      </div>

      <div className="row" style={{ marginTop: 12 }}>
        <div className="col">
          <label className="label">Goal</label>
          <select value={goal} onChange={(e) => setGoal(e.target.value)} className="input select">
            <option value="investment">Investment (rental/cashflow)</option>
            <option value="living">Living (buy to live)</option>
            <option value="mixed">Mixed</option>
          </select>
        </div>

        <div className="col">
          <label className="label">Time horizon</label>
          <select value={horizon} onChange={(e) => setHorizon(e.target.value)} className="input select">
            <option value="short">Short (0-2 years)</option>
            <option value="medium">Medium (3-7 years)</option>
            <option value="long">Long (7+ years)</option>
          </select>
        </div>

        <div className="col action-col">
          <button onClick={handleCompare} className="btn primary" disabled={loading}>
            {loading ? "Comparing..." : "Compare"}
          </button>

          <button
            onClick={handleSaveHardcoded}
            className="btn neutral"
            disabled={saving}
            style={{ marginLeft: 8 }}
          >
            {saving ? "Saving..." : "Save Hardcoded to Convex"}
          </button>
        </div>
      </div>

      {saveResult && (
        <div style={{ marginTop: 8, fontSize: 13 }}>
          Save result:{" "}
          {saveResult?.error
            ? `Error: ${String(saveResult.error)}`
            : `OK id=${saveResult?.id ?? saveResult?._id?.id ?? JSON.stringify(saveResult)}`}
        </div>
      )}

      {error && (
        <div className="error" style={{ marginTop: 12 }}>
          {error}
        </div>
      )}

      {result && (
        <>
          <div
            className={`recommendation-banner ${
              result.scores.a > result.scores.b ? "pick-a" : result.scores.b > result.scores.a ? "pick-b" : "pick-none"
            }`}
          >
            <strong>Recommendation:</strong> {result.recommendation}
          </div>

          <div className="results-grid">
            <div className="results-left">
              <table className="attributes-table">
                <thead>
                  <tr>
                    <th></th>
                    <th>Listing A</th>
                    <th>Listing B</th>
                  </tr>
                </thead>
                <tbody>
                  {renderAttributesRow("Price (THB)", "price")}
                  {renderAttributesRow("Size (sqm)", "size_sqm")}
                  {renderAttributesRow("Beds", "beds")}
                  {renderAttributesRow("Baths", "baths")}
                  {renderAttributesRow("Type", "type")}
                  {renderAttributesRow("Location", "location_summary")}
                  {renderAttributesRow("Features", "features")}
                </tbody>
              </table>

              <div className="block">
                <div style={{ display: "flex", gap: 12 }}>
                  <div style={{ flex: 1 }}>
                    <h4>Pros (A)</h4>
                    <ul>{result.pros.a.map((p, i) => <li key={i}>{p}</li>)}</ul>
                  </div>
                  <div style={{ flex: 1 }}>
                    <h4>Pros (B)</h4>
                    <ul>{result.pros.b.map((p, i) => <li key={i}>{p}</li>)}</ul>
                  </div>
                </div>
              </div>

              <div className="block">
                <div style={{ display: "flex", gap: 12 }}>
                  <div style={{ flex: 1 }}>
                    <h4>Cons (A)</h4>
                    <ul>{result.cons.a.map((c, i) => <li key={i}>{c}</li>)}</ul>
                  </div>
                  <div style={{ flex: 1 }}>
                    <h4>Cons (B)</h4>
                    <ul>{result.cons.b.map((c, i) => <li key={i}>{c}</li>)}</ul>
                  </div>
                </div>
              </div>
            </div>

            <div className="results-right">
              <div className="score-block">
                <div className="score-label">Score A</div>
                <div className="score-bar">
                  <div className="score-fill" style={{ width: `${pct(result.scores.a)}%` }}>{pct(result.scores.a)}</div>
                </div>

                <div className="score-label" style={{ marginTop: 12 }}>Score B</div>
                <div className="score-bar">
                  <div className="score-fill" style={{ width: `${pct(result.scores.b)}%` }}>{pct(result.scores.b)}</div>
                </div>

                <div className="block" style={{ marginTop: 14 }}>
                  <h4>Explainers</h4>
                  <div><strong>A:</strong> {result.explainers.a}</div>
                  <div style={{ marginTop: 8 }}><strong>B:</strong> {result.explainers.b}</div>
                </div>

                <div className="block" style={{ marginTop: 12 }}>
                  <button
                    onClick={() => {
                      navigator.clipboard?.writeText(JSON.stringify(result, null, 2));
                    }}
                    className="btn neutral"
                  >
                    Copy JSON
                  </button>
                  <button
                    onClick={() => setShowDebug((s) => !s)}
                    className="btn neutral"
                    style={{ marginLeft: 8 }}
                  >
                    {showDebug ? "Hide Debug" : "Show Debug"}
                  </button>
                </div>

                {showDebug && <pre className="debug">{JSON.stringify(result, null, 2)}</pre>}
              </div>
            </div>
          </div>
        </>
      )}

      
    </div>
  );
}
