/**
 * Copy for the "living civic community" experience (home landscape, activity, case journey,
 * Guide action trail, and the Guide demonstration). Spanish first — the Santiago de Veraguas
 * pilot's primary language — with English as the secondary. Kept separate from dictionary.ts
 * so the redesign's copy reads as one piece.
 */
export const EXPERIENCE = {
  nav: {
    home: { es: "Inicio", en: "Home" },
    activity: { es: "Actividad", en: "Activity" },
    guide: { es: "Guía", en: "Guide" },
    howGuideWorks: { es: "Cómo trabaja la Guía", en: "How the Guide works" },
    howItWorks: { es: "Cómo funciona", en: "How it works" },
    report: { es: "Reportar", en: "Report" },
    create: { es: "Crear", en: "Create" },
    agents: { es: "Agentes", en: "Agents" },
    menuLabel: { es: "Navegación principal", en: "Main navigation" },
  },

  home: {
    title: {
      es: "Del conocimiento local a la acción colectiva.",
      en: "Turn local knowledge into shared action.",
    },
    intro: {
      es: "Lo que los vecinos ven en la calle se vuelve información organizada, verificada y revisada por personas, para que la comunidad pueda actuar junta.",
      en: "What neighbors notice on the street becomes organized, verified, human-reviewed information the community can act on together.",
    },
    reportCta: { es: "Reportar un problema", en: "Report a problem" },
    proposeCta: { es: "Proponer una solución", en: "Propose a solution" },
    pilotLine: {
      es: "Piloto activo en {community}",
      en: "Pilot running in {community}",
    },
    fictional: {
      es: "Comunidad ficticia de demostración",
      en: "Fictional demonstration community",
    },
    landscapeCaption: {
      es: "Cada luz es un reporte o una propuesta, ubicada solo por área aproximada. Toca una para ver en qué etapa está.",
      en: "Each light is a report or proposal, placed only by approximate area. Tap one to see where it stands.",
    },
    journeyHeading: { es: "El recorrido de cada reporte", en: "How every report travels" },
    journeyIntro: {
      es: "Nada salta de una etapa a otra por sí solo. La Guía ayuda a organizar; las personas deciden.",
      en: "Nothing skips ahead on its own. The Guide helps organize; people decide.",
    },
    journey: [
      {
        title: { es: "Observación", en: "Observation" },
        body: {
          es: "Un vecino describe lo que ve, sin dar su nombre ni su dirección exacta.",
          en: "A neighbor describes what they see, without giving a name or exact address.",
        },
      },
      {
        title: { es: "Organización", en: "Organization" },
        body: {
          es: "Se clasifica por tipo y área, y se revisa si ya existe un caso parecido.",
          en: "It's sorted by type and area, and checked against similar existing cases.",
        },
      },
      {
        title: { es: "Verificación", en: "Verification" },
        body: {
          es: "Se marca claramente qué viene de la comunidad y qué confirmó una fuente oficial.",
          en: "It's clearly marked as a community report or confirmed by an official source.",
        },
      },
      {
        title: { es: "Revisión humana", en: "Human review" },
        body: {
          es: "Un moderador aprueba cualquier cambio importante. La IA solo sugiere.",
          en: "A moderator approves every consequential change. The AI only suggests.",
        },
      },
      {
        title: { es: "Acción compartida", en: "Shared action" },
        body: {
          es: "El caso queda visible con su historial, para que la comunidad pueda darle seguimiento.",
          en: "The case stays visible with its history, so the community can follow it through.",
        },
      },
    ],
    recentHeading: { es: "Lo último en la comunidad", en: "Latest in the community" },
    seeAllActivity: { es: "Ver toda la actividad", en: "See all activity" },
    guideHeading: { es: "Una Guía que muestra lo que hace", en: "A Guide that shows its work" },
    guideBody: {
      es: "La Guía te ayuda a describir un problema, busca casos parecidos y prepara un borrador. Nunca envía nada sin tu confirmación, y cada paso queda a la vista.",
      en: "The Guide helps you describe a problem, looks for similar cases, and prepares a draft. It never submits anything without your confirmation, and every step stays visible.",
    },
    guideSafetyStep: { es: "Revisa frases de emergencia", en: "Checks for emergency phrases" },
    guideCta: { es: "Hablar con la Guía", en: "Talk to the Guide" },
    guideDemoCta: { es: "Ver cómo trabaja", en: "See how it works" },
    trackHeading: { es: "¿Ya enviaste algo?", en: "Already sent something?" },
    trackBody: {
      es: "Escribe tu número de caso para ver en qué etapa está.",
      en: "Enter your case number to see where it stands.",
    },
  },

  landscape: {
    loading: { es: "Preparando el paisaje de la comunidad…", en: "Preparing the community landscape…" },
    listFallback: {
      es: "Vista en lista: el paisaje 3D no está disponible en este dispositivo o preferiste menos movimiento.",
      en: "List view: the 3D landscape isn't available on this device, or you prefer reduced motion.",
    },
    controlsHint: {
      es: "Arrastra para girar, desliza con dos dedos para mover, pellizca para acercar.",
      en: "Drag to rotate, two-finger drag to pan, pinch or scroll to zoom.",
    },
    areasLabel: { es: "Áreas de la comunidad", en: "Community areas" },
    allAreas: { es: "Todas las áreas", en: "All areas" },
    casesInArea: { es: "{count} en esta área", en: "{count} in this area" },
    noCasesInArea: { es: "Sin actividad en esta área", en: "No activity in this area" },
    markerLegend: {
      report: { es: "Reporte", en: "Report" },
      proposal: { es: "Propuesta", en: "Proposal" },
    },
    laterStages: { es: "Etapas posteriores", en: "Later stages" },
    legendLabel: { es: "Qué significa cada luz", en: "What each light means" },
    disclaimer: {
      es: "El paisaje es ilustrativo: muestra áreas aproximadas, nunca ubicaciones exactas. Más luces no significa que un área sea peor o más peligrosa.",
      en: "The landscape is illustrative: it shows approximate areas, never exact locations. More lights doesn't mean an area is worse or more dangerous.",
    },
    landmarks: {
      plaza: { es: "Plaza", en: "Plaza" },
      drainage: { es: "Canal de drenaje", en: "Drainage channel" },
      hall: { es: "Casa comunal", en: "Community hall" },
    },
  },

  selection: {
    heading: { es: "Caso seleccionado", en: "Selected case" },
    type: { es: "Tipo", en: "Type" },
    area: { es: "Área aproximada", en: "Approximate area" },
    verification: { es: "Verificación", en: "Verification" },
    stage: { es: "Etapa actual", en: "Current stage" },
    source: { es: "Fuente", en: "Source" },
    sourceCommunity: { es: "Enviado por la comunidad", en: "Submitted by the community" },
    sourceDemonstration: { es: "Datos de demostración", en: "Demonstration data" },
    open: { es: "Abrir el caso", en: "Open the case" },
    close: { es: "Cerrar", en: "Close" },
  },

  activity: {
    heading: { es: "Actividad de la comunidad", en: "Community activity" },
    intro: {
      es: "Reportes y propuestas de los vecinos, con la etapa en la que está cada uno.",
      en: "Neighbors' reports and proposals, with the stage each one has reached.",
    },
    patternsHeading: { es: "Patrones que la comunidad está viendo", en: "Patterns the community is seeing" },
    listHeading: { es: "Todos los casos", en: "All cases" },
    filteredTo: { es: "Mostrando: {area}", en: "Showing: {area}" },
    clearArea: { es: "Quitar filtro de área", en: "Clear area filter" },
    count: { es: "{count} casos", en: "{count} cases" },
  },

  stage: {
    observed: { es: "Observado", en: "Observed" },
    organized: { es: "Organizado", en: "Organized" },
    reviewed: { es: "Revisado", en: "Reviewed" },
    connected: { es: "Conectado", en: "Connected" },
    updated: { es: "Actualizado", en: "Updated" },
    stageOf: { es: "etapa {n} de {total}", en: "stage {n} of {total}" },
  },

  caseJourney: {
    kicker: { es: "Caso", en: "Case" },
    journeyHeading: { es: "Recorrido del caso", en: "Case journey" },
    journeyIntro: {
      es: "Solo se muestran las etapas que realmente ocurrieron.",
      en: "Only stages that actually happened are shown as reached.",
    },
    reached: { es: "Alcanzada", en: "Reached" },
    notYet: { es: "Todavía no", en: "Not yet" },
    humanReview: { es: "Revisión humana", en: "Human review" },
    byModerator: { es: "Decisión de un moderador", en: "Moderator decision" },
    bySystem: { es: "Registro automático", en: "Automatic record" },
    bySource: { es: "Fuente verificada", en: "Verified source" },
    whereHeading: { es: "Dónde, aproximadamente", en: "Roughly where" },
    whereNote: {
      es: "Solo el área aproximada. Nunca se publica una dirección ni coordenadas exactas.",
      en: "Approximate area only. An address or exact coordinates are never published.",
    },
    verificationHeading: { es: "Qué tan confirmada está la información", en: "How confirmed this is" },
    verificationExplain: {
      community_report: {
        es: "Lo describió un vecino. Todavía no lo ha confirmado una fuente oficial.",
        en: "A neighbor described it. No official source has confirmed it yet.",
      },
      officially_verified: {
        es: "Un moderador lo comprobó con una fuente oficial, enlazada abajo.",
        en: "A moderator checked it against an official source, linked below.",
      },
      needs_verification: {
        es: "Contiene algo que se puede comprobar, pero nadie lo ha comprobado todavía.",
        en: "It contains something checkable, but nobody has checked it yet.",
      },
      demonstration_data: {
        es: "Es un ejemplo ficticio para mostrar cómo funciona CommonGround.",
        en: "A fictional example that shows how CommonGround works.",
      },
    },
    checkedSource: { es: "Fuente comprobada", en: "Checked source" },
    duplicateOf: { es: "Marcado como duplicado de {case}", en: "Marked as a duplicate of {case}" },
  },

  guide: {
    heading: { es: "Guía de CommonGround", en: "CommonGround Guide" },
    intro: {
      es: "Cuéntale qué está pasando. Te ayuda a ordenar la información y prepara un borrador, pero tú decides si se envía.",
      en: "Tell it what's happening. It helps organize the details and prepares a draft, but you decide whether it's sent.",
    },
    notEmergency: {
      es: "No es un servicio de emergencia. Si hay peligro inmediato, contacta a los servicios de emergencia.",
      en: "Not an emergency service. If there's immediate danger, contact emergency services.",
    },
    starters: [
      {
        es: "El drenaje de mi calle se tapa cada vez que llueve",
        en: "The drain on my street clogs every time it rains",
      },
      { es: "¿Qué pasa después de enviar un reporte?", en: "What happens after I send a report?" },
      { es: "Quiero proponer una limpieza comunitaria", en: "I want to propose a community clean-up" },
    ],
    startersLabel: { es: "Para empezar", en: "To get started" },
    you: { es: "Tú", en: "You" },
    guideName: { es: "Guía", en: "Guide" },
    trailHeading: { es: "Lo que hizo la Guía", en: "What the Guide did" },
    trailIntro: {
      es: "Solo acciones y controles que esta página puede confirmar. Nunca su razonamiento privado.",
      en: "Only actions and checks this page can confirm. Never its private reasoning.",
    },
    trailDemoLink: {
      es: "Ver el recorrido completo, con búsqueda de duplicados",
      en: "See the full trail, including the duplicate check",
    },
    steps: {
      community: {
        title: { es: "Identificó la comunidad activa", en: "Identified the active community" },
        detail: { es: "{community}", en: "{community}" },
      },
      safety: {
        title: { es: "Revisó frases de emergencia", en: "Checked for emergency phrases" },
        waiting: { es: "Se revisa cada mensaje antes de responder.", en: "Every message is checked before any reply." },
        clear: { es: "No se detectó una emergencia en tu último mensaje.", en: "No emergency detected in your last message." },
        flagged: {
          es: "Se detectó una posible emergencia: se mostró el aviso en lugar de una respuesta.",
          en: "A possible emergency was detected: the warning was shown instead of a reply.",
        },
      },
      details: {
        title: { es: "Reuniendo los detalles", en: "Gathering the details" },
        waiting: { es: "Esperando tu primer mensaje.", en: "Waiting for your first message." },
        inProgress: {
          es: "Todavía no hay borrador: la Guía necesita tipo, categoría, descripción y área.",
          en: "No draft yet: the Guide needs a type, category, description, and area.",
        },
        done: { es: "Tiene lo necesario para un borrador.", en: "It has what a draft needs." },
      },
      classify: {
        title: { es: "Clasificó el caso", en: "Classified the case" },
        waiting: { es: "Aparece cuando hay un borrador.", en: "Appears once there's a draft." },
      },
      sources: {
        title: { es: "Fuentes aprobadas de la comunidad", en: "The community's approved sources" },
        none: {
          es: "Esta comunidad aún no tiene fuentes oficiales configuradas, así que la Guía no cita ni inventa ninguna.",
          en: "This community has no official sources configured yet, so the Guide neither cites nor invents any.",
        },
        some: {
          es: "{count} fuentes aprobadas configuradas para esta comunidad.",
          en: "{count} approved sources configured for this community.",
        },
      },
      draft: {
        title: { es: "Preparó un borrador estructurado", en: "Prepared a structured draft" },
        waiting: { es: "Todavía no.", en: "Not yet." },
        done: { es: "Revisa el borrador junto al chat.", en: "Review the draft beside the chat." },
      },
      confirm: {
        title: { es: "Espera tu confirmación", en: "Waiting for your confirmation" },
        detail: {
          es: "Nada se envía hasta que tú lo confirmes. La Guía no puede enviar por su cuenta.",
          en: "Nothing is sent until you confirm. The Guide can't submit on its own.",
        },
      },
      moderator: {
        title: { es: "Revisión de un moderador", en: "Moderator review" },
        detail: {
          es: "Después de enviarlo, cualquier cambio de estado o verificación lo aprueba una persona.",
          en: "After you send it, a person approves any change of status or verification.",
        },
      },
    },
    status: {
      done: { es: "Hecho", en: "Done" },
      active: { es: "Ahora", en: "Now" },
      pending: { es: "Pendiente", en: "Pending" },
      approval: { es: "Punto de aprobación", en: "Approval point" },
      flagged: { es: "Aviso", en: "Warning" },
      info: { es: "Dato", en: "Fact" },
    },
  },

  demo: {
    title: { es: "Cómo trabaja la Guía", en: "How the Guide works" },
    intro: {
      es: "Una demostración paso a paso con un caso de ejemplo. Los pasos se reproducen; los casos parecidos se leen de la actividad real de esta comunidad.",
      en: "A step-by-step demonstration with an example case. The steps are replayed; similar cases are read from this community's real activity.",
    },
    label: { es: "Demostración", en: "Demonstration" },
    residentSays: { es: "Un vecino escribe", en: "A neighbor writes" },
    sampleMessage: {
      es: "Cada vez que llueve, el drenaje de mi calle se tapa y el agua entra a las casas. Vivo en {area}.",
      en: "Every time it rains, the drain on my street clogs and water gets into the houses. I live in the {area}.",
    },
    draftPreview: { es: "Borrador que se va armando", en: "The draft as it takes shape" },
    draftEmpty: { es: "Todavía vacío.", en: "Still empty." },
    draftNotSent: { es: "No enviado. Espera confirmación.", en: "Not sent. Waiting for confirmation." },
    draftFields: {
      type: { es: "Tipo", en: "Type" },
      category: { es: "Categoría", en: "Category" },
      area: { es: "Área", en: "Area" },
      duplicates: { es: "Casos parecidos", en: "Similar cases" },
    },
    controls: {
      next: { es: "Siguiente paso", en: "Next step" },
      play: { es: "Reproducir", en: "Play" },
      pause: { es: "Pausar", en: "Pause" },
      restart: { es: "Reiniciar", en: "Start over" },
      progress: { es: "Paso {n} de {total}", en: "Step {n} of {total}" },
    },
    kinds: {
      tool: { es: "Acción", en: "Action" },
      evidence: { es: "Evidencia", en: "Evidence" },
      safety: { es: "Control de seguridad", en: "Safety check" },
      approval: { es: "Punto de aprobación", en: "Approval point" },
    },
    steps: [
      {
        key: "community",
        title: { es: "Identifica la comunidad activa", en: "Identifies the active community" },
        action: { es: "Lee la configuración de {community}: áreas, categorías e idiomas.", en: "Reads {community}'s configuration: areas, categories, and languages." },
        safety: { es: "Solo usa áreas configuradas; nunca pide dirección exacta.", en: "Uses configured areas only; never asks for an exact address." },
      },
      {
        key: "missing",
        title: { es: "Pide la información que falta", en: "Asks for missing information" },
        action: { es: "Pregunta desde cuándo pasa y si alguien corre peligro ahora.", en: "Asks how long it's been happening and whether anyone is in danger now." },
        safety: { es: "Revisa frases de emergencia antes de cualquier respuesta.", en: "Checks for emergency phrases before any reply." },
      },
      {
        key: "duplicates",
        title: { es: "Busca casos duplicados", en: "Checks for duplicates" },
        action: { es: "Llama a search_similar_cases y get_case_details.", en: "Calls search_similar_cases and get_case_details." },
        evidenceNone: { es: "No encontró casos abiertos parecidos en esta área.", en: "Found no similar open cases in this area." },
        evidenceSome: { es: "Encontró {count} casos parecidos en la misma área y categoría:", en: "Found {count} similar cases in the same area and category:" },
      },
      {
        key: "classify",
        title: { es: "Clasifica el problema", en: "Classifies the issue" },
        action: { es: "Tipo: reporte. Categoría: {category}. Área: {area}.", en: "Type: report. Category: {category}. Area: {area}." },
        safety: { es: "Solo categorías de la configuración de la comunidad; nada inventado.", en: "Only categories from the community's configuration; nothing invented." },
      },
      {
        key: "sources",
        title: { es: "Revisa las fuentes aprobadas", en: "Checks approved sources" },
        action: { es: "Consulta la lista de fuentes y contactos oficiales.", en: "Consults the list of official sources and contacts." },
        evidenceNone: { es: "No hay fuentes oficiales configuradas: no cita ni inventa contactos.", en: "No official sources are configured: it doesn't cite or invent contacts." },
      },
      {
        key: "draft",
        title: { es: "Prepara un borrador estructurado", en: "Prepares a structured draft" },
        action: { es: "Llama a draft_case_submission con los campos validados.", en: "Calls draft_case_submission with validated fields." },
        safety: { es: "El borrador se valida contra la configuración antes de mostrarse.", en: "The draft is validated against the configuration before it's shown." },
      },
      {
        key: "confirm",
        title: { es: "Se detiene y espera la confirmación", en: "Pauses for the resident's confirmation" },
        approval: { es: "El vecino revisa qué será público, acepta el consentimiento y confirma. La Guía no puede enviar.", en: "The neighbor reviews what will be public, gives consent, and confirms. The Guide cannot submit." },
      },
      {
        key: "moderator",
        title: { es: "Un moderador revisa los cambios importantes", en: "A moderator reviews consequential changes" },
        action: { es: "Tres agentes especialistas (duplicados, estado, verificación) sugieren; una validación fija filtra; una segunda opinión revisa.", en: "Three specialist agents (duplicates, status, verification) suggest; fixed validation filters; a second opinion reviews." },
        approval: { es: "Nada cambia hasta que un moderador aprueba cada sugerencia.", en: "Nothing changes until a moderator approves each suggestion." },
      },
    ],
    neverShown: {
      es: "Esta vista muestra acciones, evidencia, controles y puntos de aprobación. No muestra el razonamiento privado del modelo.",
      en: "This view shows actions, evidence, checks, and approval points. It doesn't show the model's private reasoning.",
    },
    tryIt: { es: "Probar la Guía", en: "Try the Guide" },
  },
} as const;

/** Tiny `{name}` interpolation for the templates above. */
export function fill(template: string, values: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (match, key: string) =>
    key in values ? String(values[key]) : match,
  );
}
