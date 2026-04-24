import { isKnownFirstName } from "@/lib/validation/first-name";
import { isKnownAnimal } from "@/lib/validation/animals";
import { isValidPlace } from "@/lib/validation/place-geonames";
import { isValidCommonNoun } from "@/lib/validation/thing-dictionary";
import { answerStartsWithLetter } from "@/lib/game/letters";

export type FieldScore = {
  name: 0 | 1;
  place: 0 | 1;
  animal: 0 | 1;
  thing: 0 | 1;
};

/**
 * Name column: 1 point only if the answer starts with the round letter and the trimmed text
 * is an exact match (case-insensitive) to an entry in `first-names.txt`. Otherwise 0.
 */
function nameFieldScoresPoint(name: string, roundLetterUpper: string): 0 | 1 {
  if (!answerStartsWithLetter(name, roundLetterUpper)) {
    return 0;
  }
  if (!isKnownFirstName(name)) {
    return 0;
  }
  return 1;
}

/**
 * All server-side rules (letter prefix + list/API checks) in one place.
 */
export async function scoreAnswers(
  roundLetter: string,
  row: { name: string; place: string; animal: string; thing: string },
): Promise<FieldScore> {
  const letter = roundLetter.toUpperCase();
  try {
    const nameP = nameFieldScoresPoint(row.name, letter);
    const [placeOk, thingOk, animalP] = await Promise.all([
      isValidPlace(row.place, letter),
      isValidCommonNoun(row.thing, letter),
      Promise.resolve(
        answerStartsWithLetter(row.animal, letter) && isKnownAnimal(row.animal) ? 1 : 0,
      ),
    ]);
    return {
      name: nameP as 0 | 1,
      place: placeOk ? 1 : 0,
      animal: animalP as 0 | 1,
      thing: thingOk ? 1 : 0,
    };
  } catch (err) {
    // Should not throw after hardening validation fetchers; keep scoring non-fatal.
    console.error("[scoreAnswers] unexpected", err);
    return { name: 0, place: 0, animal: 0, thing: 0 };
  }
}
