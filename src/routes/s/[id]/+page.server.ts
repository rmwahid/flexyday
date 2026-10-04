import { error } from "@sveltejs/kit";
import { loadHolidays } from "$lib/server/cache";
import { holidaysInYear } from "$lib/server/normalize";
import { readShare } from "$lib/server/share-store";
import type { PageServerLoad } from "./$types";

/**
 * Loads a shared schedule on the server.
 *
 * Rendering happens server side so the page arrives complete instead of showing a
 * spinner while a client fetch resolves, and so the holiday names do not have to
 * be fetched again from the browser. Only the years the schedule actually touches
 * are sent, which keeps the payload small.
 */
export const load: PageServerLoad = async ({ params, platform }) => {
  const kv = platform?.env.FLEXYDAY_KV;
  const payload = await readShare(kv, params.id);

  if (!payload) {
    error(404, "This link is unknown or has expired.");
  }

  const years = [
    ...new Set([...payload.workedDates, ...payload.takenDates].map((date) => date.slice(0, 4))),
  ].sort();

  const [company, employee] = await Promise.all([
    loadHolidays(payload.companyCountry, { kv }),
    loadHolidays(payload.employeeCountry, { kv }),
  ]);

  return {
    plan: payload,
    years,
    companyHolidays: years.flatMap((year) => holidaysInYear(company.holidays, year)),
    employeeHolidays: years.flatMap((year) => holidaysInYear(employee.holidays, year)),
  };
};
