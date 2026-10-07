import { adminHandlers } from "./adminHandlers";
import { parentHandlers } from "./parentHandlers";
import { platformHandlers } from "./platformHandlers";
import { promotionHandlers } from "./promotionHandlers";
import { sessionHandlers } from "./sessionHandlers";
import { setupHandlers } from "./setupHandlers";
import { studentHandlers } from "./studentHandlers";
import { studentRecordHandlers } from "./studentRecordHandlers";
import { teacherHandlers } from "./teacherHandlers";

/**
 * Every stand-in endpoint. Requests with no handler here (login, invites…) go to the real API.
 * Setup comes first: its score save answers school admins and leaves teachers' saves to the next.
 */
export const handlers = [...setupHandlers, ...sessionHandlers, ...promotionHandlers, ...studentHandlers, ...studentRecordHandlers, ...teacherHandlers, ...adminHandlers, ...parentHandlers, ...platformHandlers];
