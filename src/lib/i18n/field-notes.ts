/**
 * Copy for the "community field notes" layout (shell, home, explore, submit, case, Guide).
 * Spanish first for the Santiago de Veraguas pilot. Adapted from the reference design, with
 * every "sample case" line replaced by wording that fits real data — and nothing that implies
 * a report is forwarded to an institution or emergency service.
 */
export const FIELD = {
  shell: {
    wordmarkTop: { es: "Common", en: "Common" },
    wordmarkBottom: { es: "Ground", en: "Ground" },
    sideIndex: { es: "Notas comunitarias", en: "Community field notes" },
    nav: {
      home: { es: "Inicio", en: "Overview" },
      explore: { es: "Explorar casos", en: "Explore cases" },
      submit: { es: "Nuevo caso", en: "New case" },
      guide: { es: "La Guía", en: "The Guide" },
      moderation: { es: "Moderación", en: "Moderation" },
    },
    navLabel: { es: "Navegación principal", en: "Main navigation" },
    sideNoteTitle: { es: "Espacio piloto", en: "Pilot space" },
    sideNote: {
      es: "Los reportes no se envían a ninguna institución ni a servicios de emergencia.",
      en: "Reports aren't sent to any institution or emergency service.",
    },
    communityLabel: { es: "Tu comunidad", en: "Your community" },
    pilotBadge: { es: "Prototipo piloto", en: "Pilot prototype" },
    newCase: { es: "Nuevo caso", en: "New case" },
    languageLabel: { es: "Idioma", en: "Language" },
    footnote: {
      es: "CommonGround es un prototipo. Los reportes no se envían a gobiernos, instituciones ni servicios de emergencia.",
      en: "CommonGround is a prototype. Reports are not forwarded to governments, institutions, or emergency services.",
    },
    howItWorks: { es: "Cómo funciona", en: "How it works" },
  },

  place: {
    selectLabel: { es: "Elegir comunidad o lugar", en: "Choose a community or place" },
    communitiesGroup: { es: "Comunidades de CommonGround", en: "CommonGround communities" },
    placesGroup: { es: "Otros lugares", en: "Other places" },
    add: { es: "+ Agregar un lugar…", en: "+ Add a place…" },
    dialogCaps: { es: "Tus lugares", en: "Your places" },
    dialogTitle: { es: "Agrega un lugar.", en: "Add a place." },
    dialogNote: {
      es: "Agrega otra ciudad o comunidad al selector. CommonGround todavía no está configurado allí, así que no tendrá casos ni áreas.",
      en: "Add another city or community to the picker. CommonGround isn't set up there yet, so it won't have cases or areas.",
    },
    nameLabel: { es: "Nombre de la ciudad o comunidad", en: "City or community name" },
    submit: { es: "Agregar lugar", en: "Add place" },
    local: { es: "Se guarda solo en este navegador.", en: "Saved in this browser only." },
    close: { es: "Cerrar", en: "Close" },
    errors: {
      empty: { es: "Escribe un nombre.", en: "Enter a name." },
      too_long: { es: "Usa 60 caracteres o menos.", en: "Use 60 characters or fewer." },
      duplicate: { es: "Ese lugar ya está en la lista.", en: "That place is already listed." },
      full: { es: "Ya tienes 20 lugares guardados.", en: "You already have 20 saved places." },
    },
    unconfiguredTitle: {
      es: "CommonGround todavía no está configurado en {place}.",
      en: "CommonGround isn't set up in {place} yet.",
    },
    unconfiguredBody: {
      es: "Este lugar no tiene áreas, categorías ni casos. Para explorar o enviar casos, elige una comunidad de CommonGround.",
      en: "This place has no areas, categories, or cases. To explore or send cases, choose a CommonGround community.",
    },
    backTo: { es: "Volver a {community}", en: "Back to {community}" },
  },

  home: {
    eyebrow: { es: "Asuntos locales / atención compartida", en: "Local issues / shared attention" },
    headlineTop: { es: "Este es nuestro", en: "This is our" },
    headlineEmphasis: { es: "punto de encuentro.", en: "common ground." },
    stamp: { es: "{count} casos", en: "{count} cases" },
    intro: {
      es: "Conoce lo que han compartido tus vecinos, aporta tu perspectiva y sigue cada caso mientras avanza.",
      en: "See what your neighbors have raised, add your perspective, and follow each case as it develops.",
    },
    raise: { es: "Reporta un problema o una idea", en: "Raise an issue or idea" },
    mapCaps: { es: "Vista de la comunidad", en: "The community view" },
    mapSub: { es: "Solo áreas aproximadas · Toca un marcador", en: "Approximate areas only · Tap a marker" },
    mapCount: { es: "{count} casos", en: "{count} cases" },
    legendReview: { es: "Por revisar", en: "Needs review" },
    legendProgress: { es: "En curso", en: "In progress" },
    legendCase: { es: "Otro estado", en: "Other status" },
    fieldNote: { es: "Nota de campo", en: "Field note" },
    noArea: { es: "Sin área", en: "No area" },
    mapEmpty: { es: "Todavía no hay casos en esta comunidad.", en: "No cases in this community yet." },
    guideCaps: { es: "Conoce la Guía", en: "Meet the Guide" },
    guideTease: {
      es: "Lo que observas puede convertirse en un siguiente paso más claro.",
      en: "What you notice can become a clearer next step.",
    },
    talkGuide: { es: "Hablar con la Guía", en: "Talk to the Guide" },
    pulseCaps: { es: "Pulso de la comunidad", en: "The community pulse" },
    pulseText: { es: "casos abiertos para explorar en tu comunidad", en: "open cases for your community to explore" },
    recordCaps: { es: "Registro público", en: "The public record" },
    recordTitle: { es: "En la comunidad", en: "On the ground" },
    allCases: { es: "Explorar todos los casos", en: "Explore all cases" },
  },

  explore: {
    caps: { es: "Actividad comunitaria", en: "Community activity" },
    title: { es: "Explora los casos.", en: "Explore the cases." },
    sub: {
      es: "Busca reportes y propuestas por área, estado o tema. Las ubicaciones siempre son aproximadas.",
      en: "Browse reports and proposals by area, status, or topic. Locations always stay approximate.",
    },
    search: { es: "Buscar casos", en: "Search cases" },
    allTypes: { es: "Todos los tipos", en: "All types" },
    reports: { es: "Reportes", en: "Reports" },
    proposals: { es: "Propuestas", en: "Proposals" },
    allStatuses: { es: "Todos los estados", en: "All statuses" },
    allCategories: { es: "Todas las categorías", en: "All categories" },
    allAreas: { es: "Todas las áreas", en: "All areas" },
    noArea: { es: "Sin área indicada", en: "No area given" },
    results: { es: "{count} casos", en: "{count} cases" },
    resultsOne: { es: "1 caso", en: "1 case" },
    empty: { es: "No hay casos que coincidan con esos filtros.", en: "No cases match those filters." },
    clear: { es: "Quitar filtros", en: "Clear filters" },
    patterns: { es: "Patrones", en: "Patterns" },
    report: { es: "Reporte", en: "Report" },
    proposal: { es: "Propuesta", en: "Proposal" },
  },

  submit: {
    caps: { es: "Comparte tu perspectiva", en: "Add your perspective" },
    title: { es: "Empieza con lo que sabes.", en: "Start with what you know." },
    sub: {
      es: "No necesitas nombre, teléfono, dirección exacta ni ubicación precisa.",
      en: "No name, phone number, exact address, or precise location needed.",
    },
    privacyCaps: { es: "Privacidad desde el diseño", en: "Privacy by design" },
    privacyHeadline: { es: "Tu voz. Tu decisión.", en: "Your voice. Your choice." },
    privacy: [
      { es: "Elige solo un área aproximada.", en: "Choose only an approximate area." },
      { es: "Revisa tus palabras antes de enviarlas.", en: "Review your words before submitting." },
      { es: "Guarda el enlace privado para gestionar tu caso.", en: "Keep the private link to manage your case." },
      { es: "Nada se envía a instituciones ni a servicios de emergencia.", en: "Nothing is sent to institutions or emergency services." },
    ],
    guideAlternative: { es: "¿Prefieres conversar? Hazlo con la Guía.", en: "Rather talk it through? Use the Guide." },
  },

  caseView: {
    back: { es: "Volver a los casos", en: "Back to cases" },
    timelineTitle: { es: "Historia del caso", en: "The case timeline" },
    latest: { es: "Actualización más reciente", en: "Latest update" },
    earlier: { es: "Antes", en: "Earlier" },
    byModerator: { es: "Registrado por moderación", en: "Recorded by a moderator" },
    bySystem: { es: "Registro automático", en: "Automatic record" },
    bySource: { es: "Fuente verificada", en: "Verified source" },
    noForward: {
      es: "Los estados los registra la moderación comunitaria de CommonGround. No significan que el caso se envió a una institución ni a un servicio de emergencia.",
      en: "Statuses are recorded by CommonGround's community moderators. They don't mean the case was sent to an institution or emergency service.",
    },
    readingCaps: { es: "Cómo leer este caso", en: "Reading this case" },
    readingBody: {
      es: "El estado describe el avance del caso. La etiqueta de verificación explica cómo se comprobó una afirmación. Son cosas distintas.",
      en: "A status describes the case workflow. A verification label describes how a claim has been checked. They are separate.",
    },
    stage: { es: "Etapa", en: "Stage" },
    whereCaps: { es: "Dónde, aproximadamente", en: "Roughly where" },
    submitted: { es: "Enviado el {date}", en: "Submitted {date}" },
  },

  guide: {
    caps: { es: "Conoce la Guía", en: "Meet the Guide" },
    title: { es: "Encontremos las palabras.", en: "Let’s find the right words." },
    sub: {
      es: "Describe lo que observaste. La Guía te ayuda a preparar un borrador; tú decides qué sigue.",
      en: "Describe what you noticed. The Guide can help shape a draft, and you decide what happens next.",
    },
    liveBadge: { es: "Guía en vivo", en: "Live Guide" },
    sideCaps: { es: "La Guía te ayuda", en: "The Guide can help" },
    sideBig: { es: "Un poco de claridad cambia mucho.", en: "A little clarity goes a long way." },
    sideHint: {
      es: "La Guía hace preguntas, busca casos parecidos y prepara un borrador para que lo revises. Nunca envía ni cambia un caso por su cuenta.",
      en: "The Guide asks questions, looks for similar cases, and prepares a draft for your review. It never submits or changes a case on its own.",
    },
    startDraft: { es: "Empezar un borrador", en: "Start a draft" },
    seeHow: { es: "Ver cómo trabaja", en: "See how it works" },
  },
} as const;
