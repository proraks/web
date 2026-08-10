// Estonian rating descriptions for books (1–5 stars).
// Shown alongside the numeric rating in the frontend.
// Stored as plain strings keyed by the rating number.

export const RATING_LABELS_ET: Record<number, string> = {
  1: "Vihkasin seda. See raamat tegi mind kibusaks ja kui ma seda siiski lugesin, siis oli see pahavilnaga.",
  2: "Ei meeldinud, aga ei tekitanud ka mingeid tundeid.",
  3: "Raamatut lugedes nautisin ennast. Ilmselt ei mõtle sellele, kui keegi ei päri, kuid olen heal meelel, et lugesin.",
  4: "See raamat oli suurepärane aeg. Loen uuesti, et tulla tagasi nende emotsioonide juurde.",
  5: "Ma armastasin seda raamatut. See raamat tundub nagu oleks saanud osa minust.",
};

export function ratingLabelEt(rating: number | null | undefined): string {
  if (rating == null) return "Hinnang puudub";
  return RATING_LABELS_ET[rating] ?? `Hinnang ${rating} / 5`;
}
