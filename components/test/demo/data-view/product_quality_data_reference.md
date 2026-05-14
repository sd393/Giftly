# Product Quality Data — Reference for Mock Demo Generation

This doc explains the three types of product data our platform sits alongside, and gives a concrete schema for generating mock product quality data records for any product category.

---

## The Three Data Types

We compete in a space that already has two kinds of product data. Ours is a third, distinct kind.

### 1. Anonymous opinion data (e.g. Amazon reviews)
Unstructured prose from anonymous buyers. No proof of use, no calibration to who the reviewer is, no standardization across reviewers. High volume, low signal-per-unit.

### 2. Structured product attributes (e.g. brand catalogs, Sephora specs, Wirecutter spec sheets)
Objective facts about what the product *is* — materials, dimensions, ingredients, certifications, price. Tells you nothing about how it actually performs in real use.

### 3. Product quality data (our platform)
Standardized **performance recordings** from creators using the product on camera. Two sources of signal:

- **Video signals** — objective, AI-extracted measurements from the video itself (e.g. before/after states, time-on-task, observable reactions like flinching, slippage, breakage)
- **Structured creator assessment** — a prompted blurb where the creator answers a fixed set of fields rather than writing freeform prose

The result is verifiable, standardized across creators, and calibrated to who's using it (skill level, body type, comparison set). Closest analog: how *Car and Driver* tests cars on a track — same protocol every time, by drivers whose competence is known.

---

## Side-by-Side Example: Eyelash Curler

### Anonymous opinion data
> ⭐⭐⭐⭐⭐ "Best curler ever!! Gave me amazing curl. Highly recommend." — Jenny, verified purchaser

### Structured product attributes
```
Product: Lash Lift Curler
Material: Stainless steel
Curve radius: 28mm
Pad: Silicone, replaceable
Handle: 95mm
Price: $22
Origin: Made in Japan
Certifications: Hypoallergenic
```

### Product quality data (consolidated JSON)
```json
{
  "record_id": "pqd_8a4f2c",
  "captured_at": "2026-04-15T14:22:00Z",
  "product": {
    "id": "prod_lash_lift_142",
    "brand": "Lumen Beauty",
    "name": "Lash Lift Curler",
    "category": "beauty > eye tools > eyelash curlers",
    "price_usd": 22
  },
  "creator": {
    "id": "creator_maya_c",
    "follower_count": 47000,
    "niche": "skincare_and_beauty",
    "relevant_attributes": {
      "eye_shape": "hooded",
      "skill_level": "intermediate",
      "comparison_set": ["Shiseido Eyelash Curler", "Surratt Relevee Lash Curler", "Shu Uemura Petal Curler"]
    }
  },
  "video_signals": {
    "video_duration_sec": 187,
    "product_use_window_sec": 8.2,
    "before_state": {
      "curl_angle_deg": 12
    },
    "after_state": {
      "curl_angle_deg": 78,
      "curl_hold_angle_at_4min_deg": 71
    },
    "performance_metrics": {
      "curl_lift_delta_deg": 66,
      "curl_retention_pct": 91,
      "pumps_to_full_curl": 3
    },
    "observable_issues": {
      "visible_flinch": false,
      "visible_pad_slippage": false,
      "lashes_caught_or_pulled": false,
      "repositioning_attempts": 0
    },
    "context": {
      "paired_with": ["mascara"],
      "lighting_condition": "natural_daylight",
      "applied_to": "self"
    }
  },
  "creator_assessment": {
    "format": "structured_prompt",
    "fields": {
      "pinch_level": "none",
      "pad_feel": "firm, didn't slip",
      "grip_comfort_1_to_5": 4,
      "fit_for_user_attribute": {
        "attribute_name": "eye_shape",
        "attribute_value": "hooded",
        "fit_rating": "good",
        "notes": "got the inner corners, which most curlers miss"
      },
      "comparison_to_set": [
        {"vs": "Shiseido Eyelash Curler", "verdict": "better"},
        {"vs": "Surratt Relevee Lash Curler", "verdict": "worse"}
      ],
      "would_repurchase": true,
      "notable_quirks": "handle is shorter than average — took one session to adjust"
    }
  }
}
```

---

## Why This Data is Different (Three Properties)

1. **Verifiable.** The video shows what actually happened. AI extracts the lift angle, count of pumps, presence of flinching. Can't be faked the way prose reviews can.
2. **Standardized across creators.** Same AI extractor on every video, same prompted fields on every blurb. So you can aggregate and compare across hundreds of creators using the same product — impossible with Amazon reviews because every reviewer measures different things.
3. **Calibrated to the user.** Data is tagged with the creator's relevant attributes (eye shape, skin type, hair texture, body type, skill level). A shopping agent can weight feedback from creators who match the end user and ignore the rest.

---

## Schema for Generating Mock Data Across Product Categories

The structure is the same for any product. What changes per category is:
- Which `video_signals` are measurable
- Which `relevant_attributes` matter for calibration
- Which `creator_assessment` fields are worth prompting

### Template

```json
{
  "record_id": "pqd_<random>",
  "captured_at": "<ISO timestamp>",
  "product": {
    "id": "<slug>",
    "brand": "<brand>",
    "name": "<product name>",
    "category": "<top > sub > leaf>",
    "price_usd": <number>
  },
  "creator": {
    "id": "<slug>",
    "follower_count": <int>,
    "niche": "<niche>",
    "relevant_attributes": { /* category-dependent, see below */ }
  },
  "video_signals": {
    "video_duration_sec": <int>,
    "product_use_window_sec": <int>,
    "before_state": { /* category-dependent */ },
    "after_state": { /* category-dependent */ },
    "performance_metrics": { /* deltas / ratios computed from before/after */ },
    "observable_issues": { /* booleans + counts of things that went wrong */ },
    "context": { /* env conditions, what it was used with, who it was applied to */ }
  },
  "creator_assessment": {
    "format": "structured_prompt",
    "fields": { /* category-dependent prompted answers */ }
  }
}
```

### Category-Specific Examples

**Eyelash curler** — `relevant_attributes`: eye_shape, skill_level. `video_signals`: curl angle before/after, pumps, retention over time, pinch incidents. `assessment`: pinch level, pad feel, fit for eye shape, comparison set.

**Moisturizer** — `relevant_attributes`: skin_type, skin_concerns, climate. `video_signals`: pump count for full-face coverage, absorption time (seconds until matte), visible white-cast frames, pilling under makeup. `assessment`: feel (greasy/balanced/dry), scent strength, layering compatibility, breakout history.

**Running shoe** — `relevant_attributes`: foot_arch, weekly_mileage, pronation, typical_pace. `video_signals`: laps run, ground-contact-time variation, visible heel-to-toe drop response, shoe deformation under load. `assessment`: cushion firmness, toe-box width, lockdown at heel, comparison to current daily trainer.

**Blender** — `relevant_attributes`: typical_use_case (smoothies, soup, nut butter), household_size. `video_signals`: time to puree standard load, motor pitch shift over duration, residual chunks count, cleanup time. `assessment`: noise tolerability, pitcher ergonomics, cleanup difficulty, comparison to previous blender.

**Protein powder** — `relevant_attributes`: dietary_restrictions, training_modality, flavor_preferences. `video_signals`: scoops to dissolution, visible clumping, color, foam height. `assessment`: taste 1-5, mixability, post-workout digestion at 24h, sweetness level vs claim.

### Generation Guidelines

When generating mock records:

- **Vary outcomes realistically.** Not every creator should give a glowing assessment. Include creators where the product fit poorly because of their attributes (wrong skin type, wrong eye shape, etc.) — that's a key feature of the data.
- **Make video_signals quantitative wherever possible.** Numbers, deltas, counts, durations. If a signal would require a subjective judgment by the AI ("looks shiny"), put it in `creator_assessment` instead.
- **Keep observable_issues honest.** Some products will have non-zero counts here — slippage, flinches, breakage. A dataset where every record is clean is a dataset that proves nothing.
- **Calibrate creator attributes to product category.** Don't generate `eye_shape` for a blender record. Pick the 2-4 attributes that actually matter for personalized recommendations in that category.
- **Comparison set should be real competing products.** This is what makes the data useful for relative judgments — every record should anchor the product against named alternatives the creator has actually used.
