---
version: v2
name: Pustaka Editorial
description: Design system for Pustaka, a school/campus library management web app. Editorial and literary — paper and ink, magazine grids, card-catalog details. Modern and restrained, never generic AI SaaS.
colors:
  # Source: Stitch design system "Pustaka Editorial" (assets/7f056be8baf14a8bbf378d6df1a5a918, v6)
  surface: "#FFF8F1"
  background: "#FFF8F1"
  surface-bright: "#FFF8F1"
  surface-dim: "#DFD9D2"
  surface-container-lowest: "#FFFFFF"
  surface-container-low: "#F9F3EC"
  surface-container: "#F3EDE6"
  surface-container-high: "#EDE7E0"
  surface-container-highest: "#E8E2DB"
  surface-variant: "#E8E2DB"
  on-surface: "#1D1B17"
  on-background: "#1D1B17"
  on-surface-variant: "#564240"
  inverse-surface: "#33302C"
  inverse-on-surface: "#F6F0E9"
  outline: "#89726F"
  outline-variant: "#DCC0BD"
  surface-tint: "#9F3F39"
  primary: "#5B0D0D"
  on-primary: "#FFFFFF"
  primary-container: "#7A2420"
  on-primary-container: "#FF9086"
  inverse-primary: "#FFB4AC"
  primary-fixed: "#FFDAD6"
  primary-fixed-dim: "#FFB4AC"
  on-primary-fixed: "#410003"
  on-primary-fixed-variant: "#802824"
  secondary: "#4A6546"
  on-secondary: "#FFFFFF"
  secondary-container: "#C9E8C1"
  on-secondary-container: "#4E6A4A"
  secondary-fixed: "#CCEBC4"
  secondary-fixed-dim: "#B0CFA9"
  on-secondary-fixed: "#072108"
  on-secondary-fixed-variant: "#334D30"
  tertiary: "#422600"
  on-tertiary: "#FFFFFF"
  tertiary-container: "#603A00"
  on-tertiary-container: "#E7A148"
  tertiary-fixed: "#FFDDB9"
  tertiary-fixed-dim: "#FFB963"
  on-tertiary-fixed: "#2B1700"
  on-tertiary-fixed-variant: "#663E00"
  error: "#BA1A1A"
  on-error: "#FFFFFF"
  error-container: "#FFDAD6"
  on-error-container: "#93000A"
  # Brand seeds (profile overrides)
  seed-neutral: "#1C1A16"
  seed-primary: "#7A2420"
  seed-secondary: "#3F5A3C"
  seed-tertiary: "#A66A12"
  # Dark mode — not defined by the profile; kept from the earlier palette ("ruang baca malam")
  dark-surface: "#16140F"
  dark-surface-container-lowest: "#1E1B15"
  dark-on-surface: "#ECE6D8"
  dark-on-surface-variant: "#A39B8B"
  dark-outline-variant: "#3A3429"
  dark-primary: "#D0685F"
  dark-secondary: "#8FB08A"
  dark-tertiary: "#E0A948"
typography:
  display:
    fontFamily: Anton
    fontSize: 4.5rem
    fontWeight: 400
    lineHeight: 1.05
    letterSpacing: -0.01em
  h1:
    fontFamily: Anton
    fontSize: 2.5rem
    fontWeight: 400
    lineHeight: 1.1
  h2:
    fontFamily: Anton
    fontSize: 1.75rem
    fontWeight: 400
    lineHeight: 1.2
  h3:
    fontFamily: Anton
    fontSize: 1.25rem
    fontWeight: 400
    lineHeight: 1.3
  book-title:
    fontFamily: Work Sans
    fontSize: 1.125rem
    fontWeight: 600
    lineHeight: 1.3
  kicker:
    fontFamily: Work Sans
    fontSize: 0.75rem
    fontWeight: 600
    lineHeight: 1.2
    letterSpacing: 0.12em
  body-lg:
    fontFamily: Work Sans
    fontSize: 1.125rem
    fontWeight: 400
    lineHeight: 1.6
  body-md:
    fontFamily: Work Sans
    fontSize: 1rem
    fontWeight: 400
    lineHeight: 1.55
  body-sm:
    fontFamily: Work Sans
    fontSize: 0.875rem
    fontWeight: 400
    lineHeight: 1.5
  label:
    fontFamily: Work Sans
    fontSize: 0.875rem
    fontWeight: 500
    lineHeight: 1.2
  data:
    fontFamily: IBM Plex Mono
    fontSize: 0.875rem
    fontWeight: 400
    lineHeight: 1.4
    fontFeature: '"tnum" 1'
  data-lg:
    fontFamily: IBM Plex Mono
    fontSize: 2.5rem
    fontWeight: 500
    lineHeight: 1
    fontFeature: '"tnum" 1'
rounded:
  sm: 2px
  DEFAULT: 4px
  md: 6px
  lg: 8px
  xl: 12px
  full: 9999px
spacing:
  xs: 4px
  sm: 8px
  md: 16px
  lg: 24px
  xl: 40px
  2xl: 64px
  3xl: 96px
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.on-primary}"
    typography: "{typography.label}"
    rounded: "{rounded.DEFAULT}"
    padding: 10px 18px
    height: 40px
  button-secondary:
    backgroundColor: "{colors.surface-container-lowest}"
    textColor: "{colors.on-surface}"
    typography: "{typography.label}"
    rounded: "{rounded.DEFAULT}"
    padding: 10px 18px
    height: 40px
  button-ghost:
    backgroundColor: transparent
    textColor: "{colors.on-surface}"
    typography: "{typography.label}"
    rounded: "{rounded.DEFAULT}"
    padding: 10px 14px
  input:
    backgroundColor: "{colors.surface-container-lowest}"
    textColor: "{colors.on-surface}"
    typography: "{typography.body-md}"
    rounded: "{rounded.DEFAULT}"
    padding: 10px 12px
    height: 40px
  scan-input:
    backgroundColor: "{colors.surface-container-lowest}"
    textColor: "{colors.on-surface}"
    typography: "{typography.data}"
    rounded: "{rounded.DEFAULT}"
    padding: 14px 16px
    height: 56px
  card:
    backgroundColor: "{colors.surface-container-lowest}"
    textColor: "{colors.on-surface}"
    rounded: "{rounded.DEFAULT}"
    padding: 24px
  call-number-chip:
    backgroundColor: transparent
    textColor: "{colors.on-surface}"
    typography: "{typography.data}"
    rounded: "{rounded.sm}"
    padding: 2px 8px
  badge-available:
    backgroundColor: transparent
    textColor: "{colors.secondary}"
    typography: "{typography.label}"
    rounded: "{rounded.full}"
    padding: 2px 10px
  badge-on-loan:
    backgroundColor: transparent
    textColor: "{colors.on-surface-variant}"
    typography: "{typography.label}"
    rounded: "{rounded.full}"
    padding: 2px 10px
  badge-overdue:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.on-primary}"
    typography: "{typography.label}"
    rounded: "{rounded.full}"
    padding: 2px 10px
  due-slip:
    backgroundColor: "{colors.surface-container-lowest}"
    textColor: "{colors.on-surface}"
    typography: "{typography.data}"
    rounded: "{rounded.sm}"
    padding: 20px
  table-row:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.on-surface}"
    typography: "{typography.body-sm}"
    height: 44px
  sidebar:
    backgroundColor: "{colors.surface-container-high}"
    textColor: "{colors.on-surface}"
    width: 232px
---

## Overview

Pustaka is a library management system for a single school or campus: a public catalog (OPAC), a member portal used mostly on phones by students, and a dense staff console used at the circulation desk with a barcode scanner.

The visual idea is **the library as a printed object**. References are the card catalog, the date-due slip stamped inside a book, the index pages at the back of a book, and the layout of a literary magazine. Translate these into a clean, modern interface — not skeuomorphic, no paper textures, no fake stamps with grunge.

Personality: calm, literate, trustworthy, precise. The interface should feel like a well-edited publication, with typography doing most of the work. Color is used sparingly: warm paper, near-black ink, and one accent (oxblood).

The UI language is **Bahasa Indonesia**. Dates use `id-ID` format (e.g. "12 Okt 2026") and currency is Rupiah ("Rp5.000").

Three surfaces with different density:
- **Public OPAC** — airy, magazine-like, large Anton headlines, generous whitespace.
- **Member portal** — mobile-first, calm, focused on "what do I have and when is it due".
- **Staff console** — dense, keyboard-first, table-heavy, optimized for speed at the desk.

## Colors

Warm neutral foundation with a single accent. Token names follow the Stitch profile (Material roles); the editorial names in brackets are how to think about them.

- **Surfaces [paper]** — `surface` #FFF8F1 is the page background (public, portal, forms). `surface-container-lowest` #FFFFFF is for cards, inputs and anything that sits on top [paper raised]. `surface-container-low` #F9F3EC for subtle zebra and quiet panels. `surface-container` #F3EDE6 is the staff console page background. `surface-container-high` #EDE7E0 is the staff sidebar and sunken wells [paper sunken]. `surface-container-highest` / `surface-variant` #E8E2DB for chips, covers without art and tag fills.
- **Text [ink]** — `on-surface` #1D1B17 for primary text. `on-surface-variant` #564240 for secondary text and metadata [ink muted]. `outline` #89726F for placeholders, disabled text, icons at rest and strong input borders [ink faint / rule strong].
- **Lines [rule]** — `outline-variant` #DCC0BD for 1px hairline dividers and card borders, the main way structure is expressed. `on-surface` for the single 2px publication rule under a page title.
- **Accent [oxblood]** — `primary` #5B0D0D for primary buttons, active navigation, links and the brand wordmark in the portal. `primary-container` #7A2420 for overdue badges, error borders and emphasis in data (fines). `primary-fixed` #FFDAD6 only as a faint tint behind errors. Use the accent rarely so it keeps meaning. Never use it for large filled areas.
- **Status** — `secondary` #4A6546 means available / success [moss], with `secondary-container` #C9E8C1 as its badge fill. Ochre means due soon / reserved: `on-tertiary-container` #E7A148 or `tertiary-container` #603A00 for text, `tertiary-fixed` #FFDDB9 as a badge fill. `error` #BA1A1A only for form validation messages.
- **Dark mode** ("ruang baca malam") is not defined by the profile; use the `dark-*` tokens: deep warm brown-black surface and cream text, with a lighter oxblood (#D0685F).

All text/background pairs must meet WCAG 2.2 AA (4.5:1 for body text).

## Typography

Three families, each with a clear job:

- **Anton** (condensed display, weight 400 only) — page titles, section headlines, masthead, big hero statements. This is the voice of the product: bold, confident, poster-like. Use it at 20px and above only; never for body text or small labels.
- **Work Sans** — UI text, body copy, labels, buttons, navigation, and **book titles** (semibold 600). Book titles are often long, so they stay in Work Sans for readability.
- **IBM Plex Mono** with tabular numerals — anything that is data: call numbers (e.g. `899.221 PRA b`), barcodes (`PST-2026-000142`), dates, due dates, counts, Rupiah amounts, member codes.

Hierarchy rules:
- Page titles are large Anton, preceded by a small uppercase **kicker** in Work Sans with wide letter spacing (e.g. "KATALOG" above "Semua Koleksi").
- Book titles are Work Sans semibold in lists, rows, cards and forms; author names Work Sans regular in `on-surface-variant`. **Exception:** when the book title *is* the page headline (book detail page) it is set in Anton like any page title, and the typographic cover placeholder may set the title in Anton (≥20px).
- Dashboard numbers use **data-lg** (big mono, tabular) — no decorative stat cards.
- Never use more than three sizes on one card.

## Layout

- **Grid**: 12 columns, max content width 1200px on public pages, 24px gutter. Public pages use asymmetric magazine layouts — a narrow metadata column (3 cols) next to a wide content column (9 cols), or a large feature next to a narrow list.
- **Spacing** follows the 4px scale in tokens. Public pages breathe (section gaps 64–96px); the staff console is compact (16–24px).
- **Staff console**: fixed left sidebar (232px) on `surface-container-high`, top bar with global search (shortcut `/`), content area mostly tables. The circulation screen is two columns: member panel on the left (≈40%), scan list on the right.
- **Member portal (mobile)**: single column, 16px side gutter, bottom navigation with 4 items (Beranda, Pinjaman, Reservasi, Kartu).
- **OPAC home**: masthead with the library name set large in Anton, a wide search field directly below, then editorial sections "Baru di rak" and "Paling dipinjam" as horizontal rows of book covers. No hero illustration, no marketing copy.

## Elevation & Depth

Flat. Depth comes from **hairline rules and tonal surfaces**, not shadows.

- Default surfaces: no shadow, 1px `outline-variant` border or separated by hairline rules.
- Only overlays (dialog, popover, dropdown, camera sheet) get a shadow, and it is soft and short: `0 8px 24px rgba(28,26,22,0.12)`.
- Dialog backdrop: ink at 40% opacity, no blur.

## Shapes

- Corner radius is small and consistent: **4px** for buttons, inputs, cards; **2px** for chips and the due slip; pill only for status badges.
- Lines: 1px hairlines everywhere. A 2px ink rule may be used once per page under the masthead or page title, like a publication header.
- Book covers keep a 2:3 ratio with a 2px radius and a 1px rule border. Books without a cover get a **typographic placeholder**: a solid tone derived from the title, with the title in Work Sans semibold and the author in Work Sans — never a generic book icon.
- Icons: Lucide, 1.5px stroke, 16px or 20px, `on-surface` or `on-surface-variant`.

## Components

**Signature components** (use consistently, these define the brand):

- **DueSlip** — how active loans appear in the member portal. Looks like a date-due slip: a `surface-container-lowest` panel with a hairline border, the book title in Work Sans semibold, and a mono column of dates. The due date is set as a "stamp": mono, uppercase month, rotated −2°, with a thin rectangular border. Ink when normal, ochre when due in ≤2 days, oxblood when overdue.
- **IndexCard** — layout of the book detail page, like a catalog card: call number chip top-left in mono, title and author, a hairline rule, then metadata as a two-column label/value list (Penerbit, Tahun, ISBN, Bahasa, Subjek). Copies (eksemplar) listed below with barcode, shelf location and status.
- **CallNumber chip** — call number in mono inside a 1px `outline-variant` border with 2px radius. Appears on every book row.

**Standard components:**

- **Buttons** — `primary` fill with `on-primary` text; secondary `surface-container-lowest` with an `outline-variant` border; ghost for tertiary actions. Height 40px. No gradients, no icons-only primary buttons.
- **Inputs** — `surface-container-lowest`, 1px `outline` border, 4px radius; focus shows a 2px ink outline offset by 2px.
- **Scan input** — the circulation desk's main field: 56px tall, mono text, always focused, with a camera button on the right. On a successful scan the new row slides into the list below; on an error the field border turns oxblood briefly.
- **Tables** — hairline row dividers, very subtle zebra (`surface` vs `surface-container-low`), header in label style on an `outline` bottom border, numbers right-aligned in mono.
- **Status badges** — Tersedia (`secondary`), Dipinjam (`on-surface-variant`), Disimpan untuk reservasi (ochre, `tertiary-fixed` fill), Terlambat (filled `primary-container`), Hilang/Rusak (`on-surface-variant` outline).
- **Book result row (OPAC)** — cover thumbnail left, title (Work Sans semibold), author, year, CallNumber chip, availability line ("2 dari 3 tersedia · Rak B-04"). Results that came from semantic search show a small muted label "hasil semantik" — no sparkles or AI badge.
- **Member card (digital)** — `surface-container-lowest` card with the library name in Anton, member name, member code in mono, and a large QR code. Clean, like a library card, no holographic effects.
- **Empty states** — a short sentence in Anton and one action; no illustrations.
- **Toasts** — small, bottom-right on desktop, top on mobile; `surface-container-lowest` with a colored left rule for status.

## Do's and Don'ts

**Do**
- Let typography carry the hierarchy: Anton for headlines (including the book title on the detail page), Work Sans semibold for book titles everywhere else.
- Use hairline rules to structure content instead of boxes and shadows.
- Keep oxblood rare — one primary action per view.
- Show all data (dates, codes, money, counts) in Plex Mono with tabular numbers.
- Use real-looking Indonesian content: titles like "Bumi Manusia", "Laskar Pelangi", "Filosofi Teras"; names like "Nadia Putri — XI IPA 2".
- Design the staff console for keyboard and scanner speed first.

**Don't**
- No purple/blue gradients, mesh gradients, blobs, glow, or glassmorphism.
- No emoji as icons, no 3D icons, no generic people illustrations.
- No hero section with a headline + three feature cards with icons.
- No shiny, sparkle, beam, or animated-border effects.
- No large shadows and no radius above 4px (except pill badges).
- No Inter, Poppins, or Roboto.
- Never set Anton below 20px, in all-caps paragraphs, or for book titles in lists, rows and cards.
- No hype copy ("revolutionize", "seamless", "powered by AI ✨").
- No paper textures, grunge, or skeuomorphic wood/leather.
