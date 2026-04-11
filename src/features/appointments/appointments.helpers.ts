import { Appointment } from "../../types";

export function formatAppointmentRow(row: any): Appointment {
  return {
    ...row,
    datetime: row.appointment_datetime.toISOString(),
  };
}
