# Scolar — To Be Determined

> Part of the Scolar specs (`docs/specs/`).

Features and additions that are planned but not required for launch. These are not blocking anything now — they are future enhancements to be implemented when the core product is stable.

---

## 1. Handle / Username

**What it is:** A unique `@handle` per user, separate from their display name.

**Why it matters:**
- Enables mentioning or tagging users within Orgs
- Provides a consistent, searchable public-facing identity
- Display names are not unique and can't reliably identify a specific user

**What it affects:** User registration flow, profile schema, search, notifications, any future mention/tagging system.

---

## 2. Full Name vs. Single Name Field

**What it is:** Whether to split the current single `name` field into `first name` + `last name`.

**Why it matters:**
- A single display name field is simpler and flexible
- Split fields are needed for formal communications and future email notifications

**What it affects:** Registration form, user profile schema, any future notification system.

---

## 3. Title-Normalization Rules & Fuzzy Matching for Layer 2 Dedup

**What it is:** Two related future refinements to Layer 2 deduplication:
- Whether to expose or document the exact normalization rules (trimming, case handling, punctuation, whitespace collapsing) for transparency
- **Fuzzy matching + confirm:** when an incoming paper is a close-but-not-exact match to an existing global record (e.g., "A. Vaswani" vs "Ashish Vaswani"), prompt the user *"Is this the same as [existing paper]?"* and let them manually link to the existing global record

**Why it matters:** The current normalization (case-insensitive, trim, whitespace-collapse, punctuation-strip) catches common manual-entry typing variations, but cannot catch semantically-equivalent-but-differently-written values. Fuzzy matching would close that gap and further protect the one-unique-global-record rule, but it adds UX and processing complexity not needed for launch.

**What it affects:** Deduplication logic, paper upload flow, manual metadata input UX, developer documentation.

---

## 4. Embedding Input Expansion

**What it is:** Currently the embedding input per paper is title + synopsis + keywords. This item tracks whether to expand it to include other sections (e.g., intro, conclusions).

**Why it matters:** Richer embedding input could improve similarity search quality, but adds complexity to section detection and processing cost.

**What it affects:** Paper upload flow, embedding generation, similarity search quality.

---

## 5. Member Cap Scaling

**What it is:** The current hard cap is 1000 members per Org, flat for all users. This item tracks whether that cap should increase or become tiered as the product scales.

**Why it matters:** 1000 is sufficient at launch but may be limiting for large communities later.

**What it affects:** Org membership schema.

---

## 6. Configurable Invite Expiry

**What it is:** Currently invite expiry is fixed at 7 days. This item tracks whether Admins should be able to configure the expiry duration.

**Why it matters:** Some Orgs may want shorter or longer windows depending on how they recruit members.

**What it affects:** Invite creation flow, invite schema, Admin settings.

---

## 7. Email / Push Notifications

**What it is:** Currently all notifications are in-app only, delivered real-time via Firestore real-time listeners (`onSnapshot`). This item tracks adding email and/or push notification delivery.

**Why it matters:** Users who are not actively in the app would miss important events (kicks, Org deletions, invite arrivals).

**What it affects:** Notification system, infrastructure, user notification preferences.
