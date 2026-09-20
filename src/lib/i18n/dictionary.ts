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
  reportFlow: {
    typeStep: {
      heading: { es: "¿Qué quieres hacer?", en: "What would you like to do?" },
      report: {
        title: { es: "Reportar un problema", en: "Report a problem" },
        body: {
          es: "Cuéntanos sobre algo que no funciona bien en tu comunidad.",
          en: "Tell us about something that isn't working well in your community.",
        },
      },
      proposal: {
        title: { es: "Proponer una solución", en: "Propose a solution" },
        body: {
          es: "Comparte una idea constructiva para tu comunidad.",
          en: "Share a constructive idea for your community.",
        },
      },
    },
    categoryStep: {
      heading: {
        es: "¿Qué categoría describe mejor esto?",
        en: "Which category best describes this?",
      },
    },
    descriptionStep: {
      heading: { es: "Cuéntanos más", en: "Tell us more" },
      descriptionLabel: { es: "Descripción", en: "Description" },
      descriptionPlaceholder: {
        es: "Describe qué pasó, cuándo lo notaste y cualquier otro detalle que ayude a entenderlo. Puedes incluir información adicional que consideres útil.",
        en: "Describe what happened, when you noticed it, and any other detail that helps explain it. Feel free to include any other supporting information.",
      },
      photoLabel: { es: "Foto (opcional)", en: "Photo (optional)" },
      photoWarning: {
        es: "Las fotos pueden contener información personal (por ejemplo, matrículas o rostros). Solo guardamos el nombre y tipo de archivo — la imagen en sí no se sube ni se almacena en este prototipo.",
        en: "Photos may contain personal information (e.g. license plates or faces). We only keep the file name and type — the image itself is never uploaded or stored in this prototype.",
      },
      photoRemove: { es: "Quitar foto", en: "Remove photo" },
      voiceNoteLabel: { es: "Nota de voz", en: "Voice note" },
    },
    areaStep: {
      heading: {
        es: "¿En qué área aproximada ocurrió esto?",
        en: "What approximate area did this happen in?",
      },
      subheading: {
        es: "Nunca pedimos tu dirección exacta ni tu ubicación precisa.",
        en: "We never ask for your exact address or precise location.",
      },
      preferNotToSay: { es: "Prefiero no decirlo", en: "Prefer not to say" },
    },
    reviewStep: {
      heading: { es: "Revisa antes de enviar", en: "Review before you submit" },
      publicHeading: { es: "Esto será público", en: "This will be public" },
      privateHeading: { es: "Esto se mantiene privado", en: "This stays private" },
      privateBody: {
        es: "No se muestra tu nombre, teléfono ni ubicación exacta. Solo se guarda tu consentimiento y, si adjuntaste una foto, su nombre y tipo de archivo (nunca la imagen misma).",
        en: "Your name, phone number, and exact location are never shown. Only your consent and, if you attached a photo, its file name and type (never the image itself) are kept.",
      },
      consentLabel: {
        es: "He leído y acepto lo siguiente:",
        en: "I have read and agree to the following:",
      },
      submit: { es: "Enviar", en: "Submit" },
      submitting: { es: "Enviando...", en: "Submitting..." },
      genericError: {
        es: "No se pudo enviar. Por favor intenta de nuevo.",
        en: "Something went wrong submitting this. Please try again.",
      },
    },
    nav: {
      back: { es: "Atrás", en: "Back" },
      continue: { es: "Continuar", en: "Continue" },
    },
  },
  caseDetail: {
    heading: { es: "Caso", en: "Case" },
    statusHeading: { es: "Estado actual", en: "Current status" },
    submittedOn: { es: "Enviado el", en: "Submitted on" },
    notFoundHeading: { es: "No encontramos ese caso", en: "We couldn't find that case" },
    notFoundBody: {
      es: "Verifica el número de caso e intenta de nuevo.",
      en: "Double-check the case number and try again.",
    },
    confirmationBanner: {
      es: "Guarda este número de caso — es la única forma de encontrar este reporte más adelante.",
      en: "Save this case number — it's the only way to find this report again later.",
    },
    noGuaranteeNote: {
      es: "CommonGround no garantiza que este caso será resuelto. Este número te permite seguir su estado con transparencia.",
      en: "CommonGround does not guarantee this case will be resolved. This number lets you follow its status transparently.",
    },
    manageBanner: {
      es: "También guarda este enlace si quieres poder eliminar tu envío más adelante — es la única forma de hacerlo.",
      en: "Also save this link if you want to be able to delete your submission later — it's the only way to do so.",
    },
    historyHeading: { es: "Historial de estado", en: "Status history" },
    actionTrailHeading: { es: "Progreso", en: "Progress" },
    actionTrail: {
      observed: { es: "Observado", en: "Observed" },
      organized: { es: "Organizado", en: "Organized" },
      reviewed: { es: "Revisado", en: "Reviewed" },
      connected: { es: "Conectado", en: "Connected" },
      updated: { es: "Actualizado", en: "Updated" },
    },
    actorType: {
      system: { es: "Sistema", en: "System" },
      moderator: { es: "Moderador", en: "Moderator" },
      verified_source: { es: "Fuente verificada", en: "Verified source" },
    },
    inaccuracy: {
      heading: { es: "¿Algo aquí es incorrecto?", en: "Something here incorrect?" },
      body: {
        es: "Marca este caso para que un moderador lo revise. No se muestra públicamente.",
        en: "Flag this case for a moderator to review. This is never shown publicly.",
      },
      notePlaceholder: { es: "¿Qué parece incorrecto? (opcional)", en: "What looks wrong? (optional)" },
      submit: { es: "Marcar para revisión", en: "Flag for review" },
      success: { es: "Gracias, un moderador lo revisará.", en: "Thanks — a moderator will review this." },
      error: { es: "No se pudo enviar. Intenta de nuevo.", en: "Couldn't submit that. Please try again." },
    },
    manage: {
      heading: { es: "Gestionar este envío", en: "Manage this submission" },
      deleteButton: { es: "Eliminar mi envío", en: "Delete my submission" },
      confirmPrompt: {
        es: "¿Eliminar este envío? Esta acción no se puede deshacer.",
        en: "Delete this submission? This cannot be undone.",
      },
      confirmButton: { es: "Sí, eliminar", en: "Yes, delete" },
      cancelButton: { es: "Cancelar", en: "Cancel" },
      deletedNotice: {
        es: "Este envío fue eliminado.",
        en: "This submission has been deleted.",
      },
      error: { es: "No se pudo eliminar. Intenta de nuevo.", en: "Couldn't delete that. Please try again." },
    },
  },
  guide: {
    heading: { es: "Guía de CommonGround", en: "CommonGround Guide" },
    intro: {
      es: "Pregunta sobre el proceso, tu categoría, o el estado de un caso. No reemplaza los servicios de emergencia.",
      en: "Ask about the process, your category, or a case's status. It doesn't replace emergency services.",
    },
    placeholder: { es: "Escribe tu pregunta...", en: "Type your question..." },
    send: { es: "Enviar", en: "Send" },
    thinking: { es: "Pensando...", en: "Thinking..." },
    emptyState: {
      es: "Pregunta lo que quieras sobre cómo funciona CommonGround.",
      en: "Ask anything about how CommonGround works.",
    },
  },
  activity: {
    heading: { es: "Actividad", en: "Activity" },
    subheading: {
      es: "Reportes y propuestas enviados por la comunidad.",
      en: "Reports and proposals submitted by the community.",
    },
    filterAll: { es: "Todo", en: "All" },
    empty: {
      es: "Aún no hay casos para esta comunidad.",
      en: "No cases yet for this community.",
    },
    loading: { es: "Cargando...", en: "Loading..." },
  },
  pulse: {
    toggleList: { es: "Lista", en: "List" },
    toggleView: { es: "Pulso comunitario", en: "Community Pulse" },
    disclaimer: {
      es: "Pulso comunitario muestra dónde se ha reportado o propuesto actividad. No mide la calidad, el peligro ni la urgencia de un vecindario.",
      en: "Community Pulse shows where activity has been reported or proposed. It does not measure neighborhood quality, danger, or urgency.",
    },
    viewAsList: { es: "Ver como lista", en: "View as list" },
    unavailable: {
      es: "La vista 3D no está disponible en este dispositivo o con tu configuración de movimiento reducido — mostrando la lista.",
      en: "The 3D view isn't available on this device or with your reduced-motion setting — showing the list instead.",
    },
    closeDetail: { es: "Cerrar", en: "Close" },
  },
  caseLookup: {
    heading: { es: "Seguir el estado de un caso", en: "Track a case's status" },
    placeholder: { es: "Número de caso, ej. SV-2026-0001", en: "Case number, e.g. SV-2026-0001" },
    submit: { es: "Buscar", en: "Look up" },
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
