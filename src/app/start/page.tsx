import { redirect } from "next/navigation";

/**
 * Het aanmaakformulier is verhuisd naar /facilitator, samen met het overzicht van alle sessies.
 * Deze route blijft bestaan als redirect voor bestaande links en bladwijzers.
 */
export default function StartPagina() {
  redirect("/facilitator");
}
