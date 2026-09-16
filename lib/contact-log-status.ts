export function isContactLogError(status?: string, outcome?: string): boolean {
  const value = `${status || ""} ${outcome || ""}`.toLocaleLowerCase("bs-BA")

  return ["greš", "nevaž", "bounce", "fail", "nxdomain"].some((marker) => value.includes(marker))
}
