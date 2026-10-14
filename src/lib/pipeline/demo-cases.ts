/**
 * Reports a signed-in moderator submits (see submitCase) are TEST reports: EXAMPLE cases
 * (sourceType "demonstration", labelled "Ejemplo" publicly) that flow through every step,
 * including the simulated office. Each one gets this audit entry when it's created; Reset demo
 * deletes exactly the example cases that carry it (and everything attached to them). A resident's
 * report is never an example case, so it can never be selected.
 */
export const DEMO_CASE_CREATED_ACTION = "demo_case_created";

export const DEMO_CASE_CREATED_SUMMARY =
  "Submitted by a signed-in moderator, so this is a test report: an example case (labelled “Ejemplo”). Reset demo deletes it.";
