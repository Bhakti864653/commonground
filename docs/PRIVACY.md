# CommonGround — Privacy & Safety

Privacy is a visible, understandable part of the product, not a settings-page afterthought.

## Anonymous by default

CommonGround never requires: a name, a phone number, an exact address, or exact public
coordinates. It never publicly shows: exact coordinates, reporter identity, or private admin
notes. It never logs private content unnecessarily, and never stores unnecessary personal data.

## Approximate location, always

Every submission uses an `ApproximateArea` (`src/lib/schema/report.ts`): a neighborhood,
landmark, general map region, or "prefer not to say" — never an exact address. If a
lat/lng centroid is stored at all, it represents a broad region, always paired with a human
label, never rendered as pinpoint precision. The report flow's location step must show:

> "Selecciona el área general. No marques tu casa ni la dirección exacta de otra persona."
> ("Select the general area. Do not mark your home or another person's exact address.")

## The street map and its tile provider

The home page street map loads its map tiles, fonts, and style directly from OpenFreeMap
(`tiles.openfreemap.org`), a free, keyless OpenStreetMap tile service. Like any web request,
that means the tile service sees the visitor's IP address and which part of the map is being
viewed — the town, not any case. Nothing about cases, residents, or submissions is ever sent to
it: zones are computed in the browser from the community's public center point, and case
markers are ordinary page elements. Communities without a configured center point (and the
fictional demo) use the illustrative map, which makes no third-party requests.

## Consent

Every submission records a `UserConsent` (consent version, timestamp, language). Consent copy
(Spanish original below; the same text is shown in the resident's chosen interface language —
English, Portuguese, French, Simplified Chinese, Hindi, or Italian — at submission time):

> "Tu información se utilizará para organizar y revisar esta contribución comunitaria. No
> mostraremos públicamente tu identidad ni una ubicación exacta. Puedes solicitar la eliminación
> de tu envío cuando sea posible."

A deletion pathway must exist for every submission where deletion is appropriate (spec §5, §10,
§26). Photos carry an explicit warning that they may contain personal information before upload
is accepted.

## What never gets shown publicly

- Reporter identity, name, phone number, or exact address.
- Exact coordinates (only approximate area labels/clusters).
- Admin notes (`AdminNote` is a distinct type from the public case; never serialized into a
  public API response).
- Any impact number, ranking, or "worst neighborhood" comparison — CommonGround is explicitly
  not a ranking or outrage-scoring product (spec §13).

## CommonGround Guide — behavioral contract

The Guide is a calm community navigator, not "the product" and not a magical/central feature —
it never appears as the first or most prominent element on the home page.

**The Guide can:** ask clarifying questions, classify reports/proposals, identify missing
information, detect likely duplicates, explain how to submit, retrieve approved local
information, translate/simplify approved information, suggest next steps, explain a case's
status.

**Every factual answer must:** identify the active community, cite an approved source, show a
source label and last-verified date, and distinguish verified information from community
submissions — admitting uncertainty rather than filling the gap.

**The Guide must never:** invent a phone number, address, official, deadline, or government
response; pretend to be a government employee; promise an issue will be fixed; diagnose illness;
give a legal conclusion; tell a user a dangerous situation is safe; automatically submit or
forward a report; modify or close a case without explicit confirmation; reveal private user
information.

### Emergency detection

Trigger phrases (Spanish and English equivalents) include: "me estoy ahogando," "hay peligro
inmediato," "fuego," "persona herida," "ayuda urgente," "fuga de gas," "olor a gas," "huele a
gas," and their English equivalents ("I'm drowning," "immediate danger," "fire," "person
injured," "urgent help," "gas leak," "smell gas," "smells like gas," "smell of gas"), plus the
same situations in Portuguese ("estou me afogando," "perigo imediato," "fogo," "incêndio,"
"pessoa ferida," "ajuda urgente," "vazamento de gás," "cheiro de gás"), French ("je me noie,"
"danger immédiat," "au feu," "il y a le feu," "incendie," "personne blessée," "aide urgente,"
"fuite de gaz," "odeur de gaz," "ça sent le gaz"), and Simplified Chinese ("溺水," "快淹死,"
"紧急危险," "着火," "火灾," "有人受伤," "紧急求助," "煤气泄漏," "燃气泄漏," "闻到煤气," "闻到燃气"),
Hindi ("डूब रहा/रही हूँ," "तुरंत ख़तरा," "आग लग," "कोई घायल," "तुरंत मदद," "गैस लीक," "गैस रिस,"
"गैस की गंध," "गैस की बदबू"), and Italian ("sto annegando," "pericolo immediato," "al fuoco," "c'è un
incendio," "persona ferita," "aiuto urgente," "fuga di gas," "odore di gas," "puzza di gas"). When detected: show an
emergency banner **immediately**, above any normal assistant response (never buried in a longer
answer), telling the user to contact official emergency services directly. Never provide an
invented emergency contact — only a verified one, or none.

## Information & emergency page

Must state clearly that CommonGround is not an emergency service and instruct users to contact
official emergency services directly for immediate danger. Official contacts appear only when
verified, each with a source URL and last-verified date; an unconfirmed contact is labeled "Por
verificar," never presented as confirmed. No medical diagnoses, legal conclusions, evacuation
orders, safety guarantees, or unverified emergency information.

## Security baseline

Never commit secrets. `.env.example` ships with placeholders only. Uploads are validated
(type/size). User-generated content is sanitized before render. Admin routes are protected as
much as this local-prototype architecture allows. No public accusations, doxxing, harassment, or
vigilantism features of any kind — and no public ranking of neighborhoods or people, ever.
