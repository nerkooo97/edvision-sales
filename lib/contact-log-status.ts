import { stripDiacritics } from "./utils"

export function isContactLogError(status?: string, outcome?: string): boolean {
  const value = stripDiacritics(`${status || ""} ${outcome || ""}`.toLocaleLowerCase("bs-BA"))

  return ["gresk", "nevaz", "bounce", "fail", "nxdomain"].some((marker) => value.includes(marker))
}
