/** Ingredienti e step in ordine di visualizzazione: condiviso da ogni query Prisma che carica una
 * ricetta completa (pagina ricetta, modifica, stampa, modalità cottura). */
export const orderedIngredientsAndSteps = {
  ingredients: { orderBy: { sortOrder: "asc" as const } },
  steps: { orderBy: { sortOrder: "asc" as const } },
};
