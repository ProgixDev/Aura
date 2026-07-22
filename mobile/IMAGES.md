# GuériEnergies — Image asset brief

Every gradient-only surface in the app is a placeholder. This doc lists every
image we need, where it lands in the code, what dimensions / aspect ratio to
generate, and the visual direction. Generate them, drop them in the paths
below, and the screens will pick them up — wiring notes are at the bottom.

## Global art direction

- **Mood:** **dim, intimate, considered.** Editorial wellness — think Aesop
  campaigns, Joanna Maclennan stills, *Cereal* magazine — not horror, not
  Kinfolk-bright either. The viewer should feel calm and curious, never
  uneasy. Late afternoon and candle-lit interiors, not midnight.
- **Light:** low-key but readable. Roughly 60% shadow, 40% lit — one warm
  light source (window, candle, low lamp) carves the subject out of a darker
  surround. You can always *see* who or what is in the frame.
- **Palette anchor:** the app sits on a deep violet → ink gradient. Images
  extend that mood — slate, eggplant, indigo, sage, smoke — with a warm
  anchor allowed (candle gold, skin warmth). Avoid saturated reds and
  primary greens. Avoid bright daylight blue skies.
- **People:** French-coded, age 28–60, diverse. Faces are visible but
  **relaxed and inward** — eyes closed, gaze low or sideways, no posed
  smiles, no direct eye contact with the camera. Hands and posture do the
  talking as much as faces.
- **Places:** France geography only — Annecy lake at golden hour, Vercors
  forest in low cloud, Cévennes terraces, Ardèche stone interiors, Atlantic
  light through linen curtains, Paris ateliers with plants and worn wood.
- **Texture:** medium-format film, fine visible grain. A touch of atmosphere
  (incense smoke, soft haze, dust in a sunbeam) is welcome but optional.
  Never tack-sharp, never HDR.
- **Format:** PNG or JPG, sRGB, no embedded ICC profile other than sRGB.
  Filenames lowercase-kebab-case. Aim for ≤500 KB per image (compress
  liberally — these are mobile assets).

---

## 1. Brand / app identity

| File | Path | Size | Notes |
|---|---|---|---|
| `icon.png` | `assets/images/` | 1024×1024 | App icon. Centered lotus mark on the deep aurora gradient. Will be cropped to rounded square on iOS and circle on Android. Keep mark inside an 820×820 safe area. |
| `adaptive-icon.png` | `assets/images/` | 1024×1024 (transparent edges) | Android adaptive foreground. Same lotus mark, **transparent background**, no padding shrink. |
| `splash-mark.png` | `assets/images/` | 512×512 (transparent) | Optional — if you want a hand-drawn lotus mark to use across hero surfaces instead of the SVG. Not required. |

---

## 2. Onboarding carousel (3 slides)

Each slide is a full-bleed hero with white serif text overlaid in the lower
third. Generate at 1290×2200 (portrait, full-bleed iPhone). Dim and intimate
but **visibly inhabited** — the viewer should feel invited in, not lost.

| File | Slide | Direction |
|---|---|---|
| `onb-1.jpg` | **"Tous les guérisseurs, un seul lieu de confiance."** | A small group of three or four people seated on cushions or low chairs in a warm, dim interior — late afternoon light from one window catches their shoulders and a teacup or two on the floor. Faces softly visible, no one looking at camera. A sense of presence, not crowd. |
| `onb-2.jpg` | **"Choisir en confiance."** | A close-up of two hands meeting in the lit half of the frame — one open palm up, the other resting gently on top. Candle just out of frame on the right giving the warm glow. Skin tones and a corner of linen visible; the rest fades into soft shadow. Quiet trust. |
| `onb-3.jpg` | **"Une communauté qui prend soin."** | A circle of bare feet on a wooden floor — four or five people seated cross-legged in a ring, viewed from a low angle so you see feet, knees, hands resting. A single candle and a flower in the centre. Warm dim light from above. Belonging, visible, not staged. |

Animation hint (no extra asset needed): the onboarding could fade the image
up from black over ~400 ms when each slide enters.

---

## 3. Practitioners (8 people)

Each practitioner needs **one profile photo** (square) plus **one wide hero**
(used on their `fiche praticien` page) and **3 gallery photos** of their
atelier / practice space. Naming pattern: `p{id}-{slot}.jpg`.

| Practitioner | Domain | Profile photo direction |
|---|---|---|
| **p1 — Élodie Marceau** | Magnétisme · Reiki · Annecy · 14 ans d'expérience | Woman, 40s, light eyes, soft knit, lakeside or atelier with linen curtains. |
| **p2 — Mathieu Vernet** | Chamanisme · Bain sonore · Ardèche | Man, 45–55, weathered hands, holding a frame drum, stone terrace or forest edge. |
| **p3 — Camille Rossi** | Hypnose · Hypnose régressive · Lyon · visio | Woman, 35, intelligent gaze, glasses, study background with books and a single candle. |
| **p4 — Sylvain Boukhari** | Reiki · Méditation · Paris 11e · *Novice* (3 ans) | Man, 30, kind smile, simple white shirt, plant-filled Parisian apartment. |
| **p5 — Anaïs Lefèvre** | Soin énergétique · Nettoyage karmique · Bordeaux | Woman, 50, silver hair, draped scarf, atelier with herbs hanging. |
| **p6 — Pierre Cazeneuve** | Clairvoyance · Pastorat d'âmes · Toulouse · visio | Man, 60, gentle, glasses, library / writing desk, candle. |
| **p7 — Lila Hassani** | Massage thérapeutique · Soin énergétique · Marseille | Woman, 35, in motion (hand on shoulder gesture), Mediterranean tiled atelier. |
| **p8 — Thomas Berger** | Coaching de vie · Enfant intérieur · Strasbourg | Man, 40s, sitting in a chair across from the viewer, beard, wool jumper, soft afternoon light. |

### Files per practitioner

| Slot | File | Size | Crop | Notes |
|---|---|---|---|---|
| Profile | `p{id}-avatar.jpg` | 512×512 | Square | Used in result cards, chat header, conversation list. Face centered. |
| Hero | `p{id}-hero.jpg` | 1290×1620 | 4:5 portrait | Used at the top of `app/praticien/[id].tsx`. Face must sit in the upper 60% (the floating profile card overlaps the lower 40%). |
| Gallery × 3 | `p{id}-g1.jpg`, `p{id}-g2.jpg`, `p{id}-g3.jpg` | 600×600 | Square | Atelier details: hands at work, the space, an object (singing bowl, stones, candle, drum…). No people-portrait close-ups in the gallery. |

All files live in `assets/images/practitioners/`.

---

## 4. Disciplines / domain pages (12)

Each discipline has an educational page (`app/domain/[slug].tsx`) currently
using an aurora gradient hero. A single landscape hero per discipline makes it
specific.

Path: `assets/images/disciplines/{slug}.jpg`. Size: **1290×860** (16:10ish so
the floating title text reads well at the bottom).

| Slug | Title | Hero direction |
|---|---|---|
| `magnetisme` | Magnétisme | Hands hovering over a back, soft side light. |
| `reiki` | Reiki | Person lying down, palms suspended above, no faces visible. |
| `chamanisme` | Chamanisme | Hand-held drum at sunset, smoke, forest silhouette. |
| `soin-energetique` | Soin énergétique | Close-up of hands open, palms up, on a linen sheet. |
| `hypnose` | Hypnose | A single chair in a quiet room, window behind, faint glow. |
| `meditation` | Méditation | Bare feet on a meditation cushion, candle nearby. |
| `clairvoyance` | Clairvoyance | A window at dusk, sheer curtain catching the last light, a teacup on the sill. |
| `bain-sonore` | Bain sonore | Singing bowls arranged on a rug, gong shadow on the wall. |
| `massage` | Massage thérapeutique | Bottle of oil, towels, the foot of a massage table — never the patient. |
| `coaching` | Coaching de vie | Two chairs facing each other across a small table with a notebook and tea. |
| `retraites` | Retraites | A path through Vercors forest at dawn, low mist. |
| `purification` | Purification | A bundle of white sage smoking on a stone dish, dark background. |

---

## 5. Events / retreats (4)

`app/event/[id].tsx` shows a 280-pt-tall hero. Also used in the list cards
and as the "à l'affiche" featured banner on Accueil.

Path: `assets/images/events/`. Size: **1290×860**, landscape.

| File | Event | Direction |
|---|---|---|
| `e1.jpg` | Retraite équinoxe — Vercors | Forest meadow at dawn, mist rising, two figures walking away from the camera. |
| `e2.jpg` | Bain sonore de pleine lune (Paris 11e) | Dim interior, a row of singing bowls glowing under warm spot lighting. |
| `e3.jpg` | Initiation au Reiki Usui — niveau 1 (Annecy) | Hands transmitting energy over a student lying on a futon. |
| `e4.jpg` | Cercle de femmes — nouvelle lune (Lyon) | A circle of objects (candles, flowers, stones) on the floor, viewed from above, no faces. |

---

## 6. Other one-off surfaces

| Surface | Path | Size | Notes |
|---|---|---|---|
| **Founder portrait** | `assets/images/founder.jpg` | 800×1000 | Laurent (the fondateur). 50s, soft warm light, looking off-camera. Used on `app/founder.tsx` — replace the current pure-gradient hero. |
| **Confirmation orb** | (keep aurora gradient — no asset needed) | — | The breathing lotus orb on `app/booking/confirmation.tsx` works as-is. |
| **Educational article hero** ("Qu'est-ce que le Reiki, vraiment ?") | reuses `disciplines/reiki.jpg` | — | No new asset needed. |
| **Subscription hero** | `assets/images/subscription-hero.jpg` | 1290×1100 | Optional. A single hand placing a flower in a vase, candle nearby. Background for the "Faire entendre votre pratique" hero. |
| **Accueil featured retreat banner** | reuses `events/e1.jpg` | — | The card on the home screen already links to event e1. |

---

## 7. Wiring — where each asset is consumed

Once images land in the paths above, here's what to change. All are
single-line swaps because the codebase already centralises gradients
through known component props.

### `src/data/mock/practitioners.ts`

Add a `photo` and `gallery` field to each practitioner and read them with
`require(...)`:

```ts
{
  id: 'p1',
  // …existing fields…
  photo: require('../../../assets/images/practitioners/p1-avatar.jpg'),
  hero:  require('../../../assets/images/practitioners/p1-hero.jpg'),
  gallery: [
    require('../../../assets/images/practitioners/p1-g1.jpg'),
    require('../../../assets/images/practitioners/p1-g2.jpg'),
    require('../../../assets/images/practitioners/p1-g3.jpg'),
  ],
}
```

Then in `src/data/types.ts` add:

```ts
photo?: number;
hero?: number;
gallery?: number[];
```

### `src/components/Avatar.tsx`

Accept an optional `source` prop. If set, render `<Image source={source}>` on
top of the gradient (the gradient stays as a fallback while the image loads).

### `src/components/PractitionerCard.tsx`

Pass `practitioner.photo` to `<Avatar source={…} />`.

### `app/praticien/[id].tsx`

Replace the AuroraBackground in the hero with:
```tsx
<Image source={p.hero} style={StyleSheet.absoluteFillObject} resizeMode="cover" />
```
and feed the gallery section from `p.gallery`.

### `app/domain/[slug].tsx`

Add a `heroImage` field to disciplines mock:
```ts
{ slug: 'reiki', …, heroImage: require('.../disciplines/reiki.jpg') }
```
Replace `<AuroraBackground variant="soft" style={styles.hero}>` with an
`<ImageBackground>` and a dark LinearGradient overlay (so the white title
keeps contrast).

### `src/components/EventCard.tsx` and `app/event/[id].tsx`

Same pattern — add `image` to events mock, replace the per-event `LinearGradient`
with an `Image` + `LinearGradient` overlay (for legibility).

### `app/onboarding/index.tsx`

Replace `<AuroraBackground variant="soft">` per slide with a per-slide
`<ImageBackground source={slides[i].image}>` plus a darkening overlay.

### `app/founder.tsx`

Replace the aurora hero with `<ImageBackground source={require('.../founder.jpg')}>`,
keep the same dark overlay and title text.

---

## 8. Generation prompt template (for image models)

Use this as a base and append the per-image direction from the tables above:

> Editorial photograph, low-key warm light from a single window or candle,
> 60% shadow / 40% lit. Muted French palette — slate, eggplant, indigo,
> sage, smoke, with a warm candle-gold anchor. Calm, intimate, considered.
> Subject relaxed and inward — no posed smiles, no direct eye contact.
> Medium-format film aesthetic, fine grain, gentle contrast, slight haze.
> No text. No watermark. Subject: **{insert direction}**.

Avoid: harsh studio lighting, polished commercial wellness, smiling models,
direct eye contact, daylight blue sky, spa-resort cliché, crystals-and-incense
kitsch, primary-color saturation, pitch-black frames, horror-movie shadow.

---

## 9. Naming summary (so you can batch-generate)

```
assets/images/
├── icon.png
├── adaptive-icon.png
├── splash-mark.png                    (optional)
├── founder.jpg
├── subscription-hero.jpg              (optional)
├── onboarding/
│   ├── onb-1.jpg
│   ├── onb-2.jpg
│   └── onb-3.jpg
├── practitioners/
│   ├── p1-avatar.jpg  p1-hero.jpg  p1-g1.jpg  p1-g2.jpg  p1-g3.jpg
│   ├── p2-avatar.jpg  …                                 …  p2-g3.jpg
│   ├── … through p8
├── disciplines/
│   ├── magnetisme.jpg
│   ├── reiki.jpg
│   ├── chamanisme.jpg
│   ├── soin-energetique.jpg
│   ├── hypnose.jpg
│   ├── meditation.jpg
│   ├── clairvoyance.jpg
│   ├── bain-sonore.jpg
│   ├── massage.jpg
│   ├── coaching.jpg
│   ├── retraites.jpg
│   └── purification.jpg
└── events/
    ├── e1.jpg
    ├── e2.jpg
    ├── e3.jpg
    └── e4.jpg
```

**Total images to generate:** 3 (onboarding) + 40 (practitioners: 8×5) +
12 (disciplines) + 4 (events) + 1 (founder) = **60 assets**, plus the 2
identity icons.

Optional: subscription hero (+1), splash mark (+1) → 62 total.
