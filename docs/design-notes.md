# Design implementation notes

The selected reference is [design-concept.png](design-concept.png), generated using the built-in Image Gen tool before implementation. It covers the full primary dashboard. The app extends the same component system to inventory, product details, shopping, scanner, purchases, household setup, and settings.

## Design system

- Pale neutral `#f7f8f5` background, white surfaces, forest `#315c49` primary, sage accents, warm amber/red status tones. Dark mode changes semantic variables rather than individual screen colors.
- Geist typography, clear title/body/caption hierarchy, restrained 14 px corners, thin borders and minimal elevation.
- Fixed desktop sidebar, compact app header, one sage welcome banner, four overview statistics, attention list alongside shopping and monthly spending, followed by purchase history.
- Consistent Lucide outline icons. Availability always includes both an icon and text.
- shadcn/ui controls, fields, dialogs, alert dialogs, tabs, menus, avatars, cards, alerts, skeletons, empty states and Sonner notifications.
- At 390 px, the sidebar becomes bottom navigation with an easy-to-reach central Scan action. Tables scroll within their panel. Forms and panels become single-column layouts.

## Visual comparison and repairs

The concept and the rendered desktop screenshot were both inspected using `view_image`. Browser screenshots were captured with Playwright Chromium because the Browser plugin was not installed. Native desktop reference size: 1536 × 1024; mobile: 390 × 844. Screenshots include full-page captures to inspect continuation below the viewport.

| Comparison | Reference / rendered evidence | Resolution |
|---|---|---|
| Layout | Sidebar, banner, four stats, attention list, shopping/spending rail, recent purchases | Same structure and section order; four attention rows show the full item list through a link |
| Palette | Pale neutral background, sage banner, forest action, restrained status colors | Semantic tokens applied in light/dark modes; subtle surface borders restored |
| Typography | Strong page title, clear panel headings, readable row labels | Increased title, navigation, statistics, row labels, and captions after the first screenshot |
| Buttons | Primary scan action and secondary add action should share sizing | Fixed styling across Radix `asChild` triggers, whose slot attributes replace the Button slot |
| Icons | Consistent outline vocabulary and text status badges | Lucide throughout; status icons/labels checked in both themes |
| Mobile | One-column panels, two-column statistics, bottom navigation | Fixed a shopping-preview card that retained desktop `align-items: start` and shrank to its intrinsic width; confirmed no document overflow |
| Asset | Grocery bag, milk, carton, eggs and leaves in the banner | Generated a separate transparent production image, saved as `public/grocery-bag.png`; contains no functional controls or UI text |
| Copy / numbers | Reference uses illustrative amounts and generic sample entries | Correct calculated sample values replace the mockup’s invented totals; explicit preview notice prevents confusion with real household data |

The above-the-fold copy comparison preserved the two main headings, scan/add actions, navigation meanings, and four statistic labels. Intentional additions are the sample-data notice and real configuration/error states required by the brief. Further copy adaptations clarify estimates, actual spending, pending quantities, and historical prices. The profile uses initials rather than a generated person’s photograph. The production grocery asset has a textured watercolor treatment while preserving the reference’s objects and palette.

The implementation was visually checked against the reference for layout, hierarchy, typography, palette, asset framing, icon treatment, component sizing and responsive behavior. These documented product/data adaptations are intentional; it is not a pixel-identical screenshot recreation.

## Image generation brief

Tool: built-in Image Gen. No image-generation API credentials are required by the app.

Concept prompt: a full 1536 × 1024 desktop dashboard for a Malaysian household essentials app named RumahStock; white 232 px sidebar; pale neutral background; forest/sage primary; Geist/Inter typography; rounded restrained cards; household switcher, Overview, Household items, Shopping list, Scan barcode, Purchase history, Household, Settings and profile; title “A happy home starts here.”; subtitle “A little overview of what your household needs.”; sage grocery welcome banner “Less guessing. More living.” with scan/add actions; four overview cards; attention list with statuses and add-to-list actions; shared shopping preview; actual monthly spending; recent purchase history. All controls and text must be implemented natively in code; sample data must be explicitly separate from a real backend.

Production asset prompt: a standalone transparent editorial illustration of a beige grocery tote with a dark green leaf mark, milk bottle, cream carton, six eggs, sage eucalyptus and forest leaves; refined charcoal outlines, subtle paper texture/watercolor shading; muted sage, cream, forest and taupe; compact centered composition with no words or UI. Saved project asset: `public/grocery-bag.png`.
