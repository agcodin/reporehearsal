export function assignmentStartPath(repositoryId: string, incidentTemplateId: string) {
  if (repositoryId === "challenge-of-the-day") return "/daily";
  const repository = encodeURIComponent(repositoryId);
  const incident = encodeURIComponent(incidentTemplateId);
  return `/rehearsals/new?repositoryId=${repository}&incidentId=${incident}`;
}
