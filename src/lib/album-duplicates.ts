// Fotos repetidas que no son el mismo archivo (la misma foto subida de nuevo después de recomprimirse),
// así que no las detecta la huella de Storage. Salen de `scripts/find-similar-photos.mjs` y están
// revisadas a ojo. Cada grupo es la misma foto: el álbum la muestra una vez y en el ranking vale
// para un solo reto por persona. No se borra nada de la base.
export const SAME_PHOTO_GROUPS: string[][] = [
  // Mónica Pérez, 20:19 y 20:20 (mismo reto)
  ['a8801b08-a562-477e-a12a-cdf2eb6f234b', '8f434fae-121a-496e-a8f1-36e290143dca'],
  // Daniela Palmeyro, 20:48 y 20:50 (mismo reto)
  ['d9239902-a0d1-4ad8-af15-507d573c9378', '5e7fb827-1118-47d9-b291-30ce17d68463'],
  // Pilar Castelluccio, 20:56 y 20:59 (dos retos)
  ['a4fc5443-016c-4db9-887f-4bef1e2fa29c', '423e5dc2-304f-4416-9633-7ed65b1f839f'],
  // Mónica Pérez, 20:14 y 20:17 (dos retos)
  ['bbffc9e1-e390-4c94-b828-383c3b6c92eb', 'dba734f9-f3a7-431e-bd72-6826d88147af'],
  // Adriana Bossich, 20:32 y 20:36 (dos retos)
  ['eb483d1a-fa17-4017-bdac-68b5bfd4c53a', '9857100e-ce11-4e07-b155-93d35d98683f'],
  // Ainhoa Ortega y Lara González, 20:55 (subida por las dos: en el ranking le cuenta a cada una)
  ['07746b7d-01d9-45a0-8d69-69e7cf30d24e', '8853d74d-d88f-4c73-bbc3-356e5aa3be41'],
  // Valentín Blanco Vecchi y Rodrigo Aramendi, 18:16 (la del tren; subida por los dos)
  ['1ee6dee5-2029-4a76-8ff8-025bc0718143', '116561e5-cbfa-40e3-9ecf-bb1feee1d081'],
]

/** Para cada foto de un grupo, la primera del grupo: así comparten la huella con la que se deduplica. */
export const SAME_PHOTO_AS = new Map(SAME_PHOTO_GROUPS.flatMap((group) => group.map((id) => [id, group[0]] as const)))
