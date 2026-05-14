# ============================================================
# Stage 0 — Category maturity gate
# ============================================================
# Don't publish a canonical schema until the category has enough
# evaluations and enough distinct products. Otherwise discrimination
# and recurrence metrics are noise.

def category_maturity(category):
    n_evals = count_evaluations(category)
    n_products = count_distinct_products(category)
    if n_evals < 20 or n_products < 5:   return "immature"
    if n_evals < 100 or n_products < 15: return "developing"
    return "mature"


# ============================================================
# Stage 1 — Canonicalize attribute names across the category
# ============================================================
# The LLM extracts "noisy", "loud operation", "loudness level" from
# different videos. These are the same underlying attribute. Cluster
# them, then LLM-name each cluster.

def canonicalize_attribute_names(category):
    raw = []
    for eval in evaluations(category):
        for attr in eval.extracted_attributes:
            # Embed both the attribute label and a short snippet of
            # its evidence so "smell" in food vs. "smell" in candle
            # land in different clusters.
            text = f"{attr.name} || {attr.evidence_summary}"
            raw.append({
                "eval_id": eval.id,
                "original_name": attr.name,
                "embedding": embed(text),
            })

    clusters = hdbscan_cluster(
        [r["embedding"] for r in raw],
        min_cluster_size=3,
        metric="cosine",
    )

    canonical_map = {}  # (eval_id, original_name) -> canonical_name
    for cluster_id, members in clusters.items():
        canonical_name = llm_label_cluster(members)  # one LLM call
        for m in members:
            canonical_map[(m["eval_id"], m["original_name"])] = canonical_name
    return canonical_map


# ============================================================
# Stage 2 — Three sub-scores per canonical attribute
# ============================================================

def recurrence(attr, category):
    # Fraction of evaluations in the category where the attribute shows up.
    # Bounded [0, 1].
    evals = evaluations(category)
    hits = sum(1 for e in evals if attr in canonical_attrs(e))
    return hits / len(evals)


def discrimination(attr, category):
    # How well this attribute separates products in the category.
    # We take the mean score per product (across that product's
    # evaluations), then the variance across products.
    # Normalize by theoretical max variance on a 1-5 scale (= 4).
    product_means = []
    for p in products_in_category(category):
        scores = [e.score_for(attr) for e in evaluations(p)
                  if attr in canonical_attrs(e)]
        if len(scores) >= MIN_EVALS_PER_PRODUCT:   # default 2
            product_means.append(mean(scores))
    if len(product_means) < MIN_PRODUCTS:          # default 5
        return 0.0
    return min(variance(product_means) / 4.0, 1.0)


def sentiment_correlation(attr, category):
    # Does the attribute's score move with the evaluator's overall
    # reaction? Spearman so we're rank-based (more robust to outliers).
    # Absolute value: a negative correlation (high noise -> bad reaction)
    # is just as informative as a positive one.
    pairs = []
    for e in evaluations(category):
        if attr in canonical_attrs(e):
            pairs.append((e.score_for(attr), e.overall_sentiment))
    if len(pairs) < MIN_PAIRS:                     # default 10
        return 0.0
    return abs(spearman(pairs))


# ============================================================
# Stage 3 — Composite importance, with floors
# ============================================================
# Weights are tunable PER CATEGORY. They are NOT a global constant.
# Default starting point: recurrence 0.4, discrimination 0.3, sentiment 0.3.
#
# Hard floors exist because each metric has a degenerate failure mode:
#   - Recurrence alone rewards ubiquitous trivia ("the box was square")
#   - Discrimination alone rewards meaningless differences nobody cares about
#   - Sentiment alone rewards whatever the evaluator dwelled on verbally

def importance(attr, category, weights=None):
    w = weights or category_weights(category)  # {r: 0.4, d: 0.3, s: 0.3}
    r = recurrence(attr, category)
    d = discrimination(attr, category)
    s = sentiment_correlation(attr, category)

    # Floors: an attribute that fails either of these dies.
    if r < 0.15:                       # not common enough
        return 0.0
    if d < 0.05 and r > 0.80:          # everyone says the same thing
        return 0.0                     # → not useful for comparison

    return w["r"] * r + w["d"] * d + w["s"] * s


# ============================================================
# Stage 4 — Pick the canonical schema for the category
# ============================================================

def induce_canonical_schema(category, K=8):
    if category_maturity(category) == "immature":
        return None                    # don't publish a schema yet

    candidates = unique_canonical_attrs(category)
    scored = [(a, importance(a, category)) for a in candidates]
    scored = [(a, s) for (a, s) in scored if s > 0]
    scored.sort(key=lambda x: -x[1])

    schema = [a for (a, _) in scored[:K]]
    return {
        "category": category,
        "version": next_schema_version(category),
        "attributes": schema,
        "weights": category_weights(category),
        "induced_at": now(),
        "n_evaluations": count_evaluations(category),
    }


# ============================================================
# Stage 5 — Re-score every product against the canonical schema
# ============================================================
# This is the step that makes products COMPARABLE. It also produces
# the four-tag absence model from question #8.

def score_product(product, schema):
    rows = []
    for attr in schema["attributes"]:
        evals_with_attr = [e for e in evaluations(product)
                           if attr in canonical_attrs(e)]
        evals_without = [e for e in evaluations(product)
                         if attr not in canonical_attrs(e)]

        if not evals_with_attr:
            tag = "not_observed"
            score, ci = None, None
        else:
            scores = [e.score_for(attr) for e in evals_with_attr]
            evidence_types = [e.evidence_type_for(attr) for e in evals_with_attr]
            score = mean(scores)
            ci = bootstrap_ci(scores, n=1000)   # confidence interval

            if score >= 4 and "visual" in evidence_types:
                tag = "demonstrated_positive"
            elif score <= 2 and "visual" in evidence_types:
                tag = "demonstrated_negative"
            else:
                tag = "mentioned_only"

        rows.append({
            "attribute": attr,
            "score": score,
            "ci": ci,
            "n": len(evals_with_attr),
            "tag": tag,
            "schema_version": schema["version"],
        })
    return rows