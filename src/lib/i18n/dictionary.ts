export type Language = "es" | "en";

/**
 * Small hand-written dictionary for the foundation shell (nav, footer, home page). Category/
 * area/community copy already carries its own labelEs/label pair (src/lib/schema) and is read
 * directly from CommunityConfig rather than duplicated here.
 */
export const UI_STRINGS = {
  wordmark: { es: "CommonGround", en: "CommonGround" },
  languageToggle: { es: "English", en: "Español" },
  nav: {
    home: { es: "Inicio", en: "Home" },
    activity: { es: "Actividad", en: "Activity" },
    reports: { es: "Reportes", en: "Reports" },
    proposals: { es: "Propuestas", en: "Proposals" },
    guide: { es: "Guía", en: "Guide" },
    howItWorks: { es: "Cómo funciona", en: "How it works" },
    settings: { es: "Configuración", en: "Settings" },
    explore: { es: "Explorar", en: "Explore" },
    create: { es: "Crear", en: "Create" },
    more: { es: "Más", en: "More" },
  },
  comingSoon: { es: "Próximamente", en: "Coming soon" },
  fictionalBadge: { es: "Comunidad ficticia", en: "Fictional community" },
  communitySelector: {
    label: { es: "Comunidad activa", en: "Active community" },
    switchTo: { es: "Cambiar de comunidad", en: "Switch community" },
  },
  footer: {
    independenceEs:
      "CommonGround es un proyecto independiente de tecnología comunitaria. No representa a ningún gobierno, municipio, servicio de emergencia ni institución pública.",
    independenceEn:
      "CommonGround is an independent community technology project. It does not represent any government, municipality, emergency service, or public institution.",
  },
  home: {
    tagline: {
      es: "Del conocimiento local a la acción colectiva.",
      en: "Turn local knowledge into shared action.",
    },
    intro: {
      es: "CommonGround ayuda a las comunidades a transformar observaciones dispersas en información verificada, propuestas constructivas y acciones que se pueden seguir con el tiempo.",
      en: "CommonGround helps communities turn scattered local observations into verified information, constructive proposals, and trackable collective action.",
    },
    activeCommunityHeading: { es: "Comunidad activa", en: "Active community" },
    pilotQuestion: {
      es: "Pregunta piloto: ¿puede CommonGround ayudar a los residentes a enviar reportes más claros y seguros, y a entender qué pasa con ellos después?",
      en: "Pilot question: can CommonGround help residents submit clearer, safer, better-organized reports and understand what happens to them afterward?",
    },
    actionsHeading: { es: "Qué puedes hacer ahora", en: "What you can do now" },
    actions: {
      report: {
        title: { es: "Reportar un problema", en: "Report a problem" },
        body: {
          es: "Documenta inundaciones, basura, vías dañadas u otras necesidades locales.",
          en: "Document flooding, garbage, damaged roads, or other local needs.",
        },
      },
      propose: {
        title: { es: "Proponer una solución", en: "Propose a solution" },
        body: {
          es: "Comparte una idea constructiva para tu comunidad.",
          en: "Share a constructive idea for your community.",
        },
      },
      track: {
        title: { es: "Seguir el estado de un caso", en: "Track a case's status" },
        body: {
          es: "Mira la evolución real de un reporte, con historial y verificación.",
          en: "See a report's real progress, with history and verification state.",
        },
      },
      learn: {
        title: { es: "Cómo funciona", en: "How it works" },
        body: {
          es: "Entiende el proceso antes de participar.",
          en: "Understand the process before you take part.",
        },
      },
    },
    disclaimerHeading: { es: "Lo que CommonGround no es", en: "What CommonGround is not" },
    disclaimerBody: {
      es: "CommonGround no es un servicio de emergencia ni un reemplazo de los servicios de emergencia locales. No garantiza que un problema será resuelto — hace el proceso más claro, seguro, organizado y responsable.",
      en: "CommonGround is not an emergency service and does not replace local emergency services. It never guarantees a problem will be solved — it makes the process clearer, safer, more organized, and more accountable.",
    },
  },
  howItWorks: {
    heading: { es: "Cómo funciona CommonGround", en: "How CommonGround works" },
    intro: {
      es: "Un vistazo simple al proceso, antes de participar.",
      en: "A simple look at the process, before you take part.",
    },
    steps: [
      {
        title: { es: "1. Elige tu comunidad", en: "1. Choose your community" },
        body: {
          es: "Cada comunidad tiene sus propias categorías, áreas y contactos oficiales.",
          en: "Each community has its own categories, areas, and official contacts.",
        },
      },
      {
        title: { es: "2. Documenta o propone", en: "2. Document or propose" },
        body: {
          es: "Describe un problema o una propuesta en unos pocos pasos guiados, sin necesidad de tu nombre ni dirección exacta.",
          en: "Describe a problem or a proposal in a few guided steps, without needing your name or exact address.",
        },
      },
      {
        title: { es: "3. Recibe un número de caso", en: "3. Get a case number" },
        body: {
          es: "Sigue el estado públicamente: recibido, en revisión, en progreso, actualizado y más.",
          en: "Follow its status publicly: received, under review, in progress, updated, and more.",
        },
      },
      {
        title: { es: "4. Distingue lo verificado", en: "4. Tell verified apart" },
        body: {
          es: "Cada caso muestra si es un reporte comunitario o información oficialmente verificada.",
          en: "Every case shows whether it's a community report or officially verified information.",
        },
      },
    ],
    notEmergency: {
      es: "CommonGround no es un servicio de emergencia. Para emergencias, contacta siempre a los servicios locales correspondientes.",
      en: "CommonGround is not an emergency service. For emergencies, always contact your local emergency services.",
    },
  },
} as const;
