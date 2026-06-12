import json

# Sirach / Eclesiástico - 51 chapters in Spanish
ch = []

# 1
ch.append([
    "Toda sabiduría viene del Señor Dios, y con él estuvo siempre, y existe antes de todos los siglos.",
    "¿Quién ha contado la arena del mar, las gotas de la lluvia y los días del mundo? ¿Quién midió la altura del cielo, la anchura de la tierra y la profundidad del abismo?",
    "¿Quién investigó la sabiduría de Dios, que precede a todas las cosas?",
    "Antes que todas las cosas fue creada la sabiduría, y el entendimiento de la prudencia desde la eternidad.",
    "La fuente de la sabiduría es la palabra de Dios en las alturas, y sus caminos son los mandamientos eternos.",
    "¿A quién fue revelada la raíz de la sabiduría? ¿Y quién conoció sus astucias?",
    "¿A quién fue revelada y manifestada la disciplina de la sabiduría? ¿Y quién entendió la multiplicidad de sus pasos?",
    "Uno solo es el Altísimo, Creador omnipotente, rey poderoso y sumamente temible, que está sentado sobre su trono y es el Dios soberano.",
    "Él la creó en el Espíritu Santo, y la vio, la contó y la midió.",
    "Y la derramó sobre todas sus obras, y sobre toda carne, según su don, y la concedió a los que lo aman.",
    "El temor del Señor es gloria y orgullo, alegría y corona de júbilo.",
    "El temor del Señor deleitará el corazón, y dará alegría, gozo y largos días.",
    "Al que teme al Señor le irá bien en sus postrimerías, y en el día de su muerte será bendecido.",
    "El amor de Dios es sabiduría honorable.",
    "Aquellos a quienes ella se muestre la aman por la visión, y por el conocimiento de sus grandes obras.",
    "El principio de la sabiduría es el temor del Señor, y fue creada con los fieles en el seno materno; camina con las mujeres elegidas, y se da a conocer con los justos y fieles.",
    "El temor del Señor es la religiosidad de la ciencia.",
    "La religiosidad guardará y justificará el corazón; dará alegría y gozo.",
    "Al que teme al Señor le irá bien, y en los días de su consumación será bendecido.",
    "La plenitud de la sabiduría es temer a Dios, y la plenitud viene de sus frutos.",
    "Ella llenará toda su casa con sus bienes, y sus graneros con sus tesoros.",
    "La corona de la sabiduría es el temor del Señor, que llena de paz y del fruto de la salvación.",
    "Y la vio y la contó; ambas son dones de Dios.",
    "La sabiduría reparte ciencia y entendimiento de prudencia, y exalta la gloria de los que la poseen.",
    "La raíz de la sabiduría es temer al Señor, y sus ramas son de larga vida.",
    "En los tesoros de la sabiduría están el entendimiento y la religiosidad de la ciencia; pero para los pecadores la sabiduría es una abominación.",
    "El temor del Señor expulsa el pecado;",
    "porque el que no tiene temor no podrá ser justificado; pues la ira de su altivez es su ruina.",
    "El paciente soportará por un tiempo, y después se le devolverá la alegría.",
    "El buen sentido esconderá sus palabras por un tiempo, y los labios de muchos contarán su sabiduría.",
    "En los tesoros de la sabiduría está el significado de la disciplina;",
    "pero el culto de Dios es abominación para el pecador.",
    "Hijo, si deseas la sabiduría, guarda la justicia, y Dios te la dará.",
    "Porque la sabiduría y la disciplina son el temor del Señor; y lo que a él le agrada",
    "es la fe y la mansedumbre; y él llenará sus tesoros.",
    "No seas incrédulo al temor del Señor, y no te acerques a él con doble corazón.",
    "No seas hipócrita ante los hombres, y no seas tropiezo con tus labios.",
    "Atiende a estas cosas, no sea que caigas, y traigas deshonra sobre tu alma,",
    "y Dios revele tus secretos, y te derribe en medio de la asamblea,",
    "porque te acercaste al Señor con malicia, y tu corazón está lleno de engaño y falsedad.",
])

# 2
ch.append([
    "Hijo, cuando te acerques al servicio de Dios, mantente en la justicia y en el temor, y prepara tu alma para la tentación.",
    "Humilla tu corazón, y soporta; inclina tu oído, y recibe las palabras del entendimiento; y no te apresures en el tiempo de la tribulación.",
    "Soporta las demoras de Dios; únete a Dios, y soporta, para que en lo último crezca tu vida.",
    "Acepta todo lo que te sobrevenga; y en el dolor soporta, y en tu humillación ten paciencia:",
    "porque en el fuego se prueba el oro y la plata, y los hombres aceptos a Dios, en el horno de la humillación.",
    "Cree en Dios, y él te restaurará; endereza tu camino, y espera en él; guarda su temor, y envejece en él.",
    "Los que teméis al Señor, esperad su misericordia, y no os desviéis de él, para que no caigáis.",
    "Los que teméis al Señor, creedle, y vuestra recompensa no será anulada.",
    "Los que teméis al Señor, esperad en él, y la misericordia vendrá a vosotros para vuestro deleite.",
    "Los que teméis al Señor, amadlo, y vuestros corazones serán iluminados.",
    "Mirad, hijos, las generaciones de los hombres; y sabed que nadie esperó en el Señor y fue confundido.",
    "Pues ¿quién perseveró en sus mandamientos y fue abandonado? ¿O quién lo invocó y fue despreciado por él?",
    "Porque Dios es piadoso y misericordioso, y perdonará los pecados en el día de la tribulación, y es protector de todos los que lo buscan en verdad.",
    "¡Ay del de doble corazón, y de los labios criminales, y de las manos malhechoras, y del pecador que anda por la tierra por dos caminos!",
    "¡Ay de los disueltos de corazón, que no creen en Dios, y por eso no serán protegidos por él!",
    "¡Ay de los que perdieron la paciencia, y de los que abandonaron los caminos rectos, y se desviaron por caminos torcidos!",
    "¿Y qué harán cuando el Señor comience a examinar?",
    "Los que temen al Señor no serán incrédulos a su palabra; y los que lo aman guardarán su camino.",
    "Los que temen al Señor buscarán lo que le agrada; y los que lo aman se llenarán de su ley.",
    "Los que temen al Señor prepararán sus corazones, y ante él santificarán sus almas.",
    "Los que temen al Señor guardan sus mandamientos, y tendrán paciencia hasta su visitación,",
    "diciendo: Si no hacemos penitencia, caeremos en las manos del Señor, y no en las manos de los hombres.",
    "Porque según su grandeza, así también su misericordia está con él.",
])

# 3-51 will follow...

data = {
    'name': 'Eclesiástico',
    'abbreviation': 'Eclo',
    'testament': 'OT',
    'position': 26,
    'chapters': ch,
}

print(f'Chapters so far: {len(ch)}')
with open('eclo.json', 'w', encoding='utf-8') as f:
    json.dump(data, f, ensure_ascii=False)
print('Saved eclo.json with', len(ch), 'chapters')
