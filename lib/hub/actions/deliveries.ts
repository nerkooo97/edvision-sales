'use server';

import { hubErrors } from '../errors';
import { canLogDeliveries } from '../permissions';
import { getContractWeeks, isRecurring } from '../retainer';
import { deliverySchema, idSchema } from '../schemas';
import { loadProjectAccess } from '../server/access';
import { logActivity } from '../server/activities';
import { setDelivery } from '../server/deliveries';
import { requireHubUser } from '../server/session';
import { parseInput, runAction } from './run-action';

/** Records how many posts were delivered in one week of a recurring contract. */
export async function setDeliveryAction(projectId: unknown, input: unknown) {
  return runAction(async () => {
    const user = await requireHubUser();
    const id = parseInput(idSchema, projectId);
    const { week, delivered } = parseInput(deliverySchema, input);
    const { project, isParticipant } = await loadProjectAccess(user, id);

    if (!canLogDeliveries(user.role, isParticipant)) throw hubErrors.forbidden('evidenciju isporuke');
    if (!isRecurring(project) || !project.contract_start_date || !project.contract_months) {
      throw hubErrors.validation('Ovaj projekat nema ugovor s dogovorenim brojem objava.');
    }

    const weeks = getContractWeeks(project.contract_start_date, project.contract_months).length;
    if (week > weeks) throw hubErrors.validation(`Ugovor traje ${weeks} sedmica.`);

    const delivery = await setDelivery(id, week, delivered, user.id);
    await logActivity({
      projectId: id,
      userId: user.id,
      type: 'delivery_logged',
      details: `sedmica ${week}: ${delivered}`,
    });
    return delivery;
  });
}
