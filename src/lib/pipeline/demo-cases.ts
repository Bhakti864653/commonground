/**
 * Reports a moderator submits while demo mode is on (signed in AND the demo guide on — see
 * submitCase) become EXAMPLE cases: sourceType "demonstration", labelled "Ejemplo" publicly, so
 * they flow through every step including the simulated office. Each one gets this audit entry
 * when it's created; Reset demo deletes exactly the example cases that carry it (and everything
 * attached to them). A resident's report is never an example case, so it can never be selected.
 */
export const DEMO_CASE_CREATED_ACTION = "demo_case_created";

export const DEMO_CASE_CREATED_SUMMARY =
  "Created while demo mode was on, so this is an example case (labelled “Ejemplo”). Reset demo deletes it.";
