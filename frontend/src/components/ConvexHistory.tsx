// src/components/ConvexHistory.tsx
import React, { useEffect } from "react";
import { useMutation, useQuery } from "convex/react";

type CompareResult = any;

export default function ConvexHistory({
  compareResult,
  aText,
  bText,
}: {
  compareResult: CompareResult | null;
  aText: string;
  bText: string;
}) {
  const saveComparison = useMutation("saveComparison"); // Convex mutation function name
  const history = useQuery("listComparisons", 20) || [];

  // Persist to Convex when compareResult appears
  useEffect(() => {
    if (!compareResult) return;
    (async () => {
      try {
        await saveComparison({
          aText,
          bText,
          attributes: compareResult.attributes || {},
          pros: compareResult.pros || { a: [], b: [] },
          cons: compareResult.cons || { a: [], b: [] },
          scores: compareResult.scores || { a: 50, b: 50 },
          recommendation: compareResult.recommendation || "",
          explainers: compareResult.explainers || { a: "", b: "" },
          source: compareResult.source || "local",
        });
      } catch (e) {
        console.error("Convex saveComparison error", e);
      }
    })();
  }, [compareResult, aText, bText, saveComparison]);

  return (
    <aside style={{ width: 320, borderLeft: "1px solid #eee", paddingLeft: 12 }}>
      <h4 style={{ marginTop: 0 }}>History</h4>
      {history.length === 0 ? (
        <div style={{ fontSize: 13, color: "#666" }}>No comparisons yet</div>
      ) : (
        <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
          {history.map((h: any) => {
            const id = h._id?.id ?? h.id ?? "";
            return (
              <li key={id} style={{ marginBottom: 12, cursor: "pointer" }}>
                <div style={{ fontSize: 11, color: "#666" }}>{new Date(h.createdAt).toLocaleString()}</div>
                <div style={{ fontWeight: 600 }}>{h.recommendation || "Comparison"}</div>
                <div style={{ fontSize: 13, color: "#333" }}>{(h.aText || "").slice(0, 48)}...</div>
              </li>
            );
          })}
        </ul>
      )}
    </aside>
  );
}
