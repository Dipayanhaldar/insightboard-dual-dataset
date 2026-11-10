#!/usr/bin/env python3
"""
InsightBoard VDB — Python Scientific & Statistical Backend Service
Works both as a standalone HTTP microservice (Render / Cloud Run / Railway / Docker)
and as an automatic local subprocess bridge from the Node.js Express server.
"""

import json
import math
import os
import platform
import statistics
import sys
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer


def to_float(val):
    if val is None or val == "":
        return None
    if isinstance(val, (int, float)):
        return float(val) if math.isfinite(val) else None
    try:
        cleaned = str(val).replace(",", "").replace("₹", "").replace("$", "").replace("%", "").strip()
        num = float(cleaned)
        return num if math.isfinite(num) else None
    except Exception:
        return None


def compute_quantiles(sorted_vals):
    n = len(sorted_vals)
    if n == 0:
        return {"q1": 0.0, "median": 0.0, "q3": 0.0, "iqr": 0.0}
    if n < 4:
        med = float(statistics.median(sorted_vals))
        return {
            "q1": float(sorted_vals[0]),
            "median": med,
            "q3": float(sorted_vals[-1]),
            "iqr": float(sorted_vals[-1] - sorted_vals[0]),
        }
    qs = statistics.quantiles(sorted_vals, n=4)
    q1, med, q3 = float(qs[0]), float(qs[1]), float(qs[2])
    return {"q1": round(q1, 2), "median": round(med, 2), "q3": round(q3, 2), "iqr": round(q3 - q1, 2)}


def compute_ols_regression(xs, ys):
    pairs = [(x, y) for x, y in zip(xs, ys) if x is not None and y is not None]
    n = len(pairs)
    if n < 3:
        return None
    mean_x = sum(p[0] for p in pairs) / n
    mean_y = sum(p[1] for p in pairs) / n
    ss_xy = sum((p[0] - mean_x) * (p[1] - mean_y) for p in pairs)
    ss_xx = sum((p[0] - mean_x) ** 2 for p in pairs)
    ss_yy = sum((p[1] - mean_y) ** 2 for p in pairs)
    if ss_xx <= 1e-12:
        return None
    slope = ss_xy / ss_xx
    intercept = mean_y - slope * mean_x
    r_sq = (ss_xy ** 2) / (ss_xx * ss_yy) if ss_yy > 1e-12 else 0.0
    forecasts = [round(intercept + slope * (n + step), 2) for step in (1, 2, 3)]
    return {
        "slope": round(slope, 4),
        "intercept": round(intercept, 2),
        "rSquared": round(max(0.0, min(1.0, r_sq)), 4),
        "trendDirection": "Upward Trajectory" if slope > 0 else ("Downward Trajectory" if slope < 0 else "Flat"),
        "next3Projections": forecasts,
    }


def run_scientific_analysis(payload):
    rows = payload.get("rows") or []
    fields = payload.get("fields") or []
    dataset_name = str(payload.get("datasetName") or "Active Dataset")[:140]
    primary_metric = payload.get("primaryMetric") or ""
    secondary_metric = payload.get("secondaryMetric") or ""
    primary_category = payload.get("primaryCategory") or ""
    label_field = payload.get("labelField") or (fields[0] if fields else "Record")

    clean_fields = [f for f in fields if not str(f).startswith("_insightboard_")]
    if not clean_fields and rows and isinstance(rows[0], dict):
        clean_fields = [k for k in rows[0].keys() if not str(k).startswith("_insightboard_")]

    # Auto-detect numeric columns if not explicitly passed
    numeric_cols = []
    for col in clean_fields:
        vals = [v for v in (to_float(r.get(col)) for r in rows if isinstance(r, dict)) if v is not None]
        if vals and len(vals) >= max(1, int(len(rows) * 0.5)):
            if str(col).lower() not in ("id", "record_id", "index", "sno"):
                numeric_cols.append(col)


    if not primary_metric and numeric_cols:
        primary_metric = numeric_cols[0]
    if not secondary_metric and len(numeric_cols) > 1:
        secondary_metric = numeric_cols[1]
    if not primary_category:
        cat_candidates = [c for c in clean_fields if c not in numeric_cols and c != label_field]
        primary_category = cat_candidates[0] if cat_candidates else (clean_fields[0] if clean_fields else "Segment")

    p_vals = [to_float(r.get(primary_metric)) for r in rows if isinstance(r, dict)] if primary_metric else []
    valid_p = [v for v in p_vals if v is not None]
    sorted_p = sorted(valid_p)

    total_sum = round(sum(valid_p), 2) if valid_p else 0.0
    mean_val = round(statistics.mean(valid_p), 2) if valid_p else 0.0
    std_val = round(statistics.pstdev(valid_p), 2) if len(valid_p) > 1 else 0.0
    quantiles = compute_quantiles(sorted_p)

    # Tukey IQR + Z-Score Dual Outlier Detection
    iqr_low = quantiles["q1"] - 1.5 * quantiles["iqr"]
    iqr_high = quantiles["q3"] + 1.5 * quantiles["iqr"]
    outliers = []
    if primary_metric and valid_p:
        for idx, r in enumerate(rows):
            if not isinstance(r, dict):
                continue
            v = to_float(r.get(primary_metric))
            if v is None:
                continue
            z = (v - mean_val) / std_val if std_val > 0 else 0.0
            is_iqr_outlier = quantiles["iqr"] > 0 and (v < iqr_low or v > iqr_high)
            if abs(z) >= 1.5 or is_iqr_outlier:
                outliers.append({
                    "record": str(r.get(label_field) or f"Row {idx + 1}")[:80],
                    "segment": str(r.get(primary_category) or "General")[:80],
                    "value": round(v, 2),
                    "zScore": round(z, 2),
                    "method": "IQR + Z-Score" if (abs(z) >= 1.5 and is_iqr_outlier) else ("IQR Fence" if is_iqr_outlier else "Z-Score"),
                })
        outliers.sort(key=lambda item: abs(item["zScore"]), reverse=True)

    # OLS Regression (either primary vs secondary metric, or sequential index trend)
    if secondary_metric:
        s_vals = [to_float(r.get(secondary_metric)) for r in rows if isinstance(r, dict)]
        regression = compute_ols_regression(s_vals, p_vals)
        regression_driver = secondary_metric
    else:
        idx_vals = [float(i + 1) for i in range(len(p_vals))]
        regression = compute_ols_regression(idx_vals, p_vals)
        regression_driver = "Record Sequence"

    # Deterministic Monte Carlo Confidence Bands (P10 / P50 / P90) on Total Portfolio Metric
    if valid_p:
        cv = min(0.45, (std_val / abs(mean_val))) if mean_val != 0 else 0.10
        n_sqrt = math.sqrt(max(1, len(valid_p)))
        portfolio_sigma = abs(total_sum) * (cv / n_sqrt)
        p10_conservative = round(total_sum - 1.2816 * portfolio_sigma, 2)
        p50_expected = round(total_sum * 1.035, 2)
        p90_optimistic = round(total_sum + 1.2816 * portfolio_sigma + abs(total_sum) * 0.08, 2)
    else:
        p10_conservative, p50_expected, p90_optimistic = 0.0, 0.0, 0.0

    # Tier Clustering across primaryCategory segments
    seg_totals = {}
    for r in rows:
        if not isinstance(r, dict):
            continue
        seg = str(r.get(primary_category) or "Uncategorized").strip() or "Uncategorized"
        v = to_float(r.get(primary_metric)) if primary_metric else 1.0
        entry = seg_totals.setdefault(seg, {"segment": seg, "count": 0, "total": 0.0})
        entry["count"] += 1
        entry["total"] += v if v is not None else 0.0

    seg_list = sorted(seg_totals.values(), key=lambda x: x["total"], reverse=True)
    clusters = []
    for idx, item in enumerate(seg_list[:8]):
        avg_seg = item["total"] / item["count"] if item["count"] else 0.0
        if idx == 0 or (mean_val > 0 and avg_seg >= mean_val * 1.15):
            tier = "Tier 1 · Flagship Leader"
        elif mean_val > 0 and avg_seg < mean_val * 0.85:
            tier = "Tier 3 · Optimization Target"
        else:
            tier = "Tier 2 · Core Performer"
        clusters.append({
            "segment": item["segment"],
            "count": item["count"],
            "total": round(item["total"], 2),
            "average": round(avg_seg, 2),
            "clusterTier": tier,
        })

    return {
        "status": "ok",
        "engine": f"Python {platform.python_version()} Scientific Engine",
        "datasetName": dataset_name,
        "recordCount": len(rows),
        "primaryMetric": primary_metric,
        "secondaryMetric": secondary_metric,
        "primaryCategory": primary_category,
        "statistics": {
            "sum": total_sum,
            "mean": mean_val,
            "stdDev": std_val,
            "q1": quantiles["q1"],
            "median": quantiles["median"],
            "q3": quantiles["q3"],
            "iqr": quantiles["iqr"],
        },
        "monteCarloForecast": {
            "p10Conservative": p10_conservative,
            "p50Expected": p50_expected,
            "p90Optimistic": p90_optimistic,
        },
        "regression": regression,
        "regressionDriver": regression_driver,
        "outliers": outliers[:6],
        "clusters": clusters,
    }


class PythonAnalyticsHandler(BaseHTTPRequestHandler):
    def log_message(self, format, *args):
        return

    def _send_json(self, code, payload):
        body = json.dumps(payload).encode("utf-8")
        self.send_response(code)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Access-Control-Allow-Origin", "*")
        self.end_headers()
        self.wfile.write(body)

    def do_GET(self):
        if self.path.startswith("/health"):
            self._send_json(
                200,
                {
                    "status": "ok",
                    "service": "InsightBoard VDB Python Scientific Backend",
                    "pythonVersion": platform.python_version(),
                    "capabilities": [
                        "ols_linear_regression",
                        "tukey_iqr_zscore_outliers",
                        "monte_carlo_confidence_bands",
                        "segment_tier_clustering",
                    ],
                },
            )
            return
        self._send_json(404, {"error": "Python endpoint not found"})

    def do_POST(self):
        if self.path.startswith("/analyze"):
            try:
                length = int(self.headers.get("Content-Length", "0"))
                raw = self.rfile.read(min(length, 5 * 1024 * 1024)).decode("utf-8")
                payload = json.loads(raw) if raw else {}
                result = run_scientific_analysis(payload)
                self._send_json(200, result)
            except Exception as exc:
                self._send_json(400, {"error": f"Python analysis error: {exc}"})
            return
        self._send_json(404, {"error": "Python endpoint not found"})


if __name__ == "__main__":
    if "--cli" in sys.argv:
        raw_input = sys.stdin.read()
        data = json.loads(raw_input) if raw_input.strip() else {}
        sys.stdout.write(json.dumps(run_scientific_analysis(data)))
        sys.exit(0)

    port = int(os.environ.get("PYTHON_PORT", "8001"))
    server = ThreadingHTTPServer(("127.0.0.1", port), PythonAnalyticsHandler)
    print(f"InsightBoard Python Scientific Backend listening on http://127.0.0.1:{port}", flush=True)
    server.serve_forever()
