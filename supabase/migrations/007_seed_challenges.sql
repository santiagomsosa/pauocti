-- Seed de desafíos fotográficos (ON CONFLICT evita duplicados si se corre más de una vez)
insert into public.challenges (title, description, emoji) values
  ('Sacate una foto con un pelado', 'Dicen que los pelados traen suerte. ¿Será verdad?', '🧢'),
  ('Sacate una foto con un jugador del B.U.F.C.', 'Encontrá a uno de los cracks del equipo.', '⚽'),
  ('Sacate una foto con alguien que tenga vestido o corbata roja', 'Un toque de color entre tanto look elegante.', '🔴'),
  ('Sacate una foto con una amiga de la novia', 'Encontrá a una de las que la conoce de memoria.', '👯‍♀️'),
  ('Sacate una foto con un hincha de River y uno de Boca', 'Por una noche, que reine la paz.', '🏆'),
  ('Sacate una foto con alguien que esté tomando fernet', 'Más argentino que esto, difícil.', '🥃'),
  ('Sacate una foto con alguien que haya venido de otra provincia u otro país', 'Hay invitados que hicieron kilómetros para estar acá.', '✈️'),
  ('Sacate una foto con alguien que no conocías antes de la fiesta', 'Rompé el hielo y hacete amigo.', '🤝'),
  ('Sacate una foto con la persona más alta que encuentres', 'Cuanto mayor sea la diferencia, mejor.', '📏'),
  ('Sacate una foto con alguien que tenga el mismo nombre que vos', 'Encontrá a tu tocayo o tocaya.', '👥'),
  ('Sacate una foto con una pareja que lleve más de 25 años junta', 'Pediles el secreto antes de sacar la foto.', '💑'),
  ('Sacate una foto con alguien que tenga un tatuaje escondido', 'Que lo muestre... si se anima.', '🎨'),
  ('Sacate una foto con la mesa más fiestera', 'Buscá a los que ya estén haciendo lío.', '🎉'),
  ('Sacate una foto con alguien que tenga los zapatos en la mano', 'Señal inequívoca de que la fiesta se puso buena.', '👠'),
  ('Sacate una foto con alguien usando cotillón', 'Cuanto más ridículo, mejor.', '🎊'),
  ('Sacate una foto con alguien bailando cuarteto', 'Que se note que alguna vez escuchó La Mona.', '💃'),
  ('Sacate una foto con los novios sin que estén posando', 'Capturálos en algún momento espontáneo de la noche.', '💍'),
  ('Sacate una foto brindando con alguien que acabás de conocer', 'Un brindis vale más si es con alguien nuevo.', '🥂'),
  ('Sacate una foto imitando la pose de los novios en la torta', 'A ver quién la clava mejor.', '🎂'),
  ('Sacate una foto con el ramo de la novia', 'Antes o después de que lo tiren, ¡vale igual!', '💐'),
  ('Sacate una selfie con la mayor cantidad de gente posible en un solo cuadro', 'Cuantos más, mejor la foto grupal.', '🤳')
on conflict (title) do nothing;
