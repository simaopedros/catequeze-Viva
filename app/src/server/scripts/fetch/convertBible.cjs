/**
 * Converts downloaded _source.json Bible files into individual book JSON files.
 * Run: node src/server/scripts/fetch/convertBible.cjs
 * 
 * Source: thiagobodruk/bible (GitHub)
 * Each translation has its own abbreviation scheme.
 */
const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', 'data', 'bible');

// Catholic canon order (73 books, positions 1-73)
const CANON_POS = {
  gn:1,ex:2,lv:3,nm:4,dt:5,js:6,jz:7,rt:8,'1sm':9,'2sm':10,'1rs':11,'2rs':12,'1cr':13,'2cr':14,ed:15,ne:16,
  tb:17,jt:18,et:19,job:20,sl:21,pv:22,ec:23,ct:24,
  sb:25,eclo:26,is:27,jr:28,lm:29,
  br:30,ez:31,dn:32,os:33,jl:34,am:35,ob:36,jn:37,mq:38,na:39,hc:40,sf:41,ag:42,zc:43,ml:44,'1mc':45,'2mc':46,
  mt:47,mc:48,lc:49,jo:50,at:51,rm:52,'1co':53,'2co':54,gl:55,ef:56,fp:57,cl:58,'1ts':59,'2ts':60,'1tm':61,'2tm':62,tt:63,fm:64,hb:65,tg:66,'1pe':67,'2pe':68,'1jo':69,'2jo':70,'3jo':71,jd:72,ap:73
};
function testament(pos) { return pos <= 46 ? 'OT' : 'NT'; }

// Mapping from source abbreviation -> canonical abbreviation
// Each locale has its own source abbreviation scheme
const ABBREV_MAP = {
  'pt-BR': {
    gn:'gn',ex:'ex',lv:'lv',nm:'nm',dt:'dt',js:'js',jz:'jz',rt:'rt','1sm':'1sm','2sm':'2sm','1rs':'1rs','2rs':'2rs','1cr':'1cr','2cr':'2cr',ed:'ed',ne:'ne',et:'et',
    'jó':'job', sl:'sl',pv:'pv',ec:'ec',ct:'ct',is:'is',jr:'jr',lm:'lm',ez:'ez',dn:'dn',os:'os',jl:'jl',am:'am',ob:'ob',jn:'jn',mq:'mq',na:'na',hc:'hc',sf:'sf',ag:'ag',zc:'zc',ml:'ml',
    mt:'mt',mc:'mc',lc:'lc',jo:'jo','atos':'at',rm:'rm','1co':'1co','2co':'2co',gl:'gl',ef:'ef',fp:'fp',cl:'cl','1ts':'1ts','2ts':'2ts','1tm':'1tm','2tm':'2tm',tt:'tt',fm:'fm',hb:'hb',tg:'tg','1pe':'1pe','2pe':'2pe','1jo':'1jo','2jo':'2jo','3jo':'3jo',jd:'jd',ap:'ap',
  },
  en: {
    gn:'gn',ex:'ex',lv:'lv',nm:'nm',dt:'dt',js:'js',jud:'jz',rt:'rt','1sm':'1sm','2sm':'2sm','1kgs':'1rs','2kgs':'2rs','1ch':'1cr','2ch':'2cr',ezr:'ed',ne:'ne',et:'et',
    job:'job',ps:'sl',prv:'pv',ec:'ec',so:'ct',is:'is',jr:'jr',lm:'lm',ez:'ez',dn:'dn',ho:'os',jl:'jl',am:'am',ob:'ob',jn:'jn',mi:'mq',na:'na',hk:'hc',zp:'sf',hg:'ag',zc:'zc',ml:'ml',
    mt:'mt',mk:'mc',lk:'lc',jo:'jo',act:'at',rm:'rm','1co':'1co','2co':'2co',gl:'gl',eph:'ef',ph:'fp',cl:'cl','1ts':'1ts','2ts':'2ts','1tm':'1tm','2tm':'2tm',tt:'tt',phm:'fm',hb:'hb',jm:'tg','1pe':'1pe','2pe':'2pe','1jo':'1jo','2jo':'2jo','3jo':'3jo',jd:'jd',re:'ap',
  },
  es: {
    gn:'gn',ex:'ex',lv:'lv',nm:'nm',dt:'dt',js:'js',jud:'jz',rt:'rt','1sm':'1sm','2sm':'2sm','1kgs':'1rs','2kgs':'2rs','1ch':'1cr','2ch':'2cr',ezr:'ed',ne:'ne',et:'et',
    job:'job',ps:'sl',prv:'pv',ec:'ec',so:'ct',is:'is',jr:'jr',lm:'lm',ez:'ez',dn:'dn',ho:'os',jl:'jl',am:'am',ob:'ob',jn:'jn',mi:'mq',na:'na',hk:'hc',zp:'sf',hg:'ag',zc:'zc',ml:'ml',
    mt:'mt',mk:'mc',lk:'lc',jo:'jo',act:'at',rm:'rm','1co':'1co','2co':'2co',gl:'gl',eph:'ef',ph:'fp',cl:'cl','1ts':'1ts','2ts':'2ts','1tm':'1tm','2tm':'2tm',tt:'tt',phm:'fm',hb:'hb',jm:'tg','1pe':'1pe','2pe':'2pe','1jo':'1jo','2jo':'2jo','3jo':'3jo',jd:'jd',re:'ap',
  },
};

// Book names per locale
const BOOK_NAMES = {
  'pt-BR': {
    gn:{name:'Gênesis',abbr:'Gn'},ex:{name:'Êxodo',abbr:'Ex'},lv:{name:'Levítico',abbr:'Lv'},nm:{name:'Números',abbr:'Nm'},dt:{name:'Deuteronômio',abbr:'Dt'},js:{name:'Josué',abbr:'Js'},jz:{name:'Juízes',abbr:'Jz'},rt:{name:'Rute',abbr:'Rt'},'1sm':{name:'I Samuel',abbr:'1Sm'},'2sm':{name:'II Samuel',abbr:'2Sm'},'1rs':{name:'I Reis',abbr:'1Rs'},'2rs':{name:'II Reis',abbr:'2Rs'},'1cr':{name:'I Crônicas',abbr:'1Cr'},'2cr':{name:'II Crônicas',abbr:'2Cr'},ed:{name:'Esdras',abbr:'Ed'},ne:{name:'Neemias',abbr:'Ne'},et:{name:'Ester',abbr:'Et'},job:{name:'Jó',abbr:'Jó'},sl:{name:'Salmos',abbr:'Sl'},pv:{name:'Provérbios',abbr:'Pr'},ec:{name:'Eclesiastes',abbr:'Ec'},ct:{name:'Cântico dos Cânticos',abbr:'Ct'},is:{name:'Isaías',abbr:'Is'},jr:{name:'Jeremias',abbr:'Jr'},lm:{name:'Lamentações',abbr:'Lm'},ez:{name:'Ezequiel',abbr:'Ez'},dn:{name:'Daniel',abbr:'Dn'},os:{name:'Oseias',abbr:'Os'},jl:{name:'Joel',abbr:'Jl'},am:{name:'Amós',abbr:'Am'},ob:{name:'Abdias',abbr:'Ab'},jn:{name:'Jonas',abbr:'Jn'},mq:{name:'Miqueias',abbr:'Mq'},na:{name:'Naum',abbr:'Na'},hc:{name:'Habacuc',abbr:'Hb'},sf:{name:'Sofonias',abbr:'Sf'},ag:{name:'Ageu',abbr:'Ag'},zc:{name:'Zacarias',abbr:'Zc'},ml:{name:'Malaquias',abbr:'Ml'},mt:{name:'São Mateus',abbr:'Mt'},mc:{name:'São Marcos',abbr:'Mc'},lc:{name:'São Lucas',abbr:'Lc'},jo:{name:'São João',abbr:'Jo'},at:{name:'Atos dos Apóstolos',abbr:'At'},rm:{name:'Romanos',abbr:'Rm'},'1co':{name:'I Coríntios',abbr:'1Cor'},'2co':{name:'II Coríntios',abbr:'2Cor'},gl:{name:'Gálatas',abbr:'Gl'},ef:{name:'Efésios',abbr:'Ef'},fp:{name:'Filipenses',abbr:'Fl'},cl:{name:'Colossenses',abbr:'Cl'},'1ts':{name:'I Tessalonicenses',abbr:'1Ts'},'2ts':{name:'II Tessalonicenses',abbr:'2Ts'},'1tm':{name:'I Timóteo',abbr:'1Tm'},'2tm':{name:'II Timóteo',abbr:'2Tm'},tt:{name:'Tito',abbr:'Tt'},fm:{name:'Filemon',abbr:'Fm'},hb:{name:'Hebreus',abbr:'Hb'},tg:{name:'São Tiago',abbr:'Tg'},'1pe':{name:'I São Pedro',abbr:'1Pd'},'2pe':{name:'II São Pedro',abbr:'2Pd'},'1jo':{name:'I São João',abbr:'1Jo'},'2jo':{name:'II São João',abbr:'2Jo'},'3jo':{name:'III São João',abbr:'3Jo'},jd:{name:'São Judas',abbr:'Jd'},ap:{name:'Apocalipse',abbr:'Ap'},
  },
  en: {
    gn:{name:'Genesis',abbr:'Gn'},ex:{name:'Exodus',abbr:'Ex'},lv:{name:'Leviticus',abbr:'Lv'},nm:{name:'Numbers',abbr:'Nm'},dt:{name:'Deuteronomy',abbr:'Dt'},js:{name:'Joshua',abbr:'Js'},jz:{name:'Judges',abbr:'Jz'},rt:{name:'Ruth',abbr:'Rt'},'1sm':{name:'I Samuel',abbr:'1Sm'},'2sm':{name:'II Samuel',abbr:'2Sm'},'1rs':{name:'I Kings',abbr:'1Rs'},'2rs':{name:'II Kings',abbr:'2Rs'},'1cr':{name:'I Chronicles',abbr:'1Cr'},'2cr':{name:'II Chronicles',abbr:'2Cr'},ed:{name:'Ezra',abbr:'Ed'},ne:{name:'Nehemiah',abbr:'Ne'},et:{name:'Esther',abbr:'Et'},job:{name:'Job',abbr:'Jó'},sl:{name:'Psalms',abbr:'Sl'},pv:{name:'Proverbs',abbr:'Pr'},ec:{name:'Ecclesiastes',abbr:'Ec'},ct:{name:'Song of Solomon',abbr:'Ct'},is:{name:'Isaiah',abbr:'Is'},jr:{name:'Jeremiah',abbr:'Jr'},lm:{name:'Lamentations',abbr:'Lm'},ez:{name:'Ezekiel',abbr:'Ez'},dn:{name:'Daniel',abbr:'Dn'},os:{name:'Hosea',abbr:'Os'},jl:{name:'Joel',abbr:'Jl'},am:{name:'Amos',abbr:'Am'},ob:{name:'Obadiah',abbr:'Ab'},jn:{name:'Jonah',abbr:'Jn'},mq:{name:'Micah',abbr:'Mq'},na:{name:'Nahum',abbr:'Na'},hc:{name:'Habakkuk',abbr:'Hb'},sf:{name:'Zephaniah',abbr:'Sf'},ag:{name:'Haggai',abbr:'Ag'},zc:{name:'Zechariah',abbr:'Zc'},ml:{name:'Malachi',abbr:'Ml'},mt:{name:'Matthew',abbr:'Mt'},mc:{name:'Mark',abbr:'Mc'},lc:{name:'Luke',abbr:'Lc'},jo:{name:'John',abbr:'Jo'},at:{name:'Acts',abbr:'At'},rm:{name:'Romans',abbr:'Rm'},'1co':{name:'I Corinthians',abbr:'1Cor'},'2co':{name:'II Corinthians',abbr:'2Cor'},gl:{name:'Galatians',abbr:'Gl'},ef:{name:'Ephesians',abbr:'Ef'},fp:{name:'Philippians',abbr:'Fl'},cl:{name:'Colossians',abbr:'Cl'},'1ts':{name:'I Thessalonians',abbr:'1Ts'},'2ts':{name:'II Thessalonians',abbr:'2Ts'},'1tm':{name:'I Timothy',abbr:'1Tm'},'2tm':{name:'II Timothy',abbr:'2Tm'},tt:{name:'Titus',abbr:'Tt'},fm:{name:'Philemon',abbr:'Fm'},hb:{name:'Hebrews',abbr:'Hb'},tg:{name:'James',abbr:'Tg'},'1pe':{name:'I Peter',abbr:'1Pd'},'2pe':{name:'II Peter',abbr:'2Pd'},'1jo':{name:'I John',abbr:'1Jo'},'2jo':{name:'II John',abbr:'2Jo'},'3jo':{name:'III John',abbr:'3Jo'},jd:{name:'Jude',abbr:'Jd'},ap:{name:'Revelation',abbr:'Ap'},
  },
  es: {
    gn:{name:'Génesis',abbr:'Gn'},ex:{name:'Éxodo',abbr:'Ex'},lv:{name:'Levítico',abbr:'Lv'},nm:{name:'Números',abbr:'Nm'},dt:{name:'Deuteronomio',abbr:'Dt'},js:{name:'Josué',abbr:'Js'},jz:{name:'Jueces',abbr:'Jz'},rt:{name:'Rut',abbr:'Rt'},'1sm':{name:'I Samuel',abbr:'1Sm'},'2sm':{name:'II Samuel',abbr:'2Sm'},'1rs':{name:'I Reyes',abbr:'1Rs'},'2rs':{name:'II Reyes',abbr:'2Rs'},'1cr':{name:'I Crónicas',abbr:'1Cr'},'2cr':{name:'II Crónicas',abbr:'2Cr'},ed:{name:'Esdras',abbr:'Ed'},ne:{name:'Nehemías',abbr:'Ne'},et:{name:'Ester',abbr:'Et'},job:{name:'Job',abbr:'Jó'},sl:{name:'Salmos',abbr:'Sl'},pv:{name:'Proverbios',abbr:'Pr'},ec:{name:'Eclesiastés',abbr:'Ec'},ct:{name:'Cantares',abbr:'Ct'},is:{name:'Isaías',abbr:'Is'},jr:{name:'Jeremías',abbr:'Jr'},lm:{name:'Lamentaciones',abbr:'Lm'},ez:{name:'Ezequiel',abbr:'Ez'},dn:{name:'Daniel',abbr:'Dn'},os:{name:'Oseas',abbr:'Os'},jl:{name:'Joel',abbr:'Jl'},am:{name:'Amós',abbr:'Am'},ob:{name:'Abdías',abbr:'Ab'},jn:{name:'Jonás',abbr:'Jn'},mq:{name:'Miqueas',abbr:'Mq'},na:{name:'Nahúm',abbr:'Na'},hc:{name:'Habacuc',abbr:'Hb'},sf:{name:'Sofonías',abbr:'Sf'},ag:{name:'Hageo',abbr:'Ag'},zc:{name:'Zacarías',abbr:'Zc'},ml:{name:'Malaquías',abbr:'Ml'},mt:{name:'Mateo',abbr:'Mt'},mc:{name:'Marcos',abbr:'Mc'},lc:{name:'Lucas',abbr:'Lc'},jo:{name:'Juan',abbr:'Jo'},at:{name:'Hechos',abbr:'At'},rm:{name:'Romanos',abbr:'Rm'},'1co':{name:'I Corintios',abbr:'1Cor'},'2co':{name:'II Corintios',abbr:'2Cor'},gl:{name:'Gálatas',abbr:'Gl'},ef:{name:'Efesios',abbr:'Ef'},fp:{name:'Filipenses',abbr:'Fl'},cl:{name:'Colosenses',abbr:'Cl'},'1ts':{name:'I Tesalonicenses',abbr:'1Ts'},'2ts':{name:'II Tesalonicenses',abbr:'2Ts'},'1tm':{name:'I Timoteo',abbr:'1Tm'},'2tm':{name:'II Timoteo',abbr:'2Tm'},tt:{name:'Tito',abbr:'Tt'},fm:{name:'Filemón',abbr:'Fm'},hb:{name:'Hebreos',abbr:'Hb'},tg:{name:'Santiago',abbr:'Tg'},'1pe':{name:'I Pedro',abbr:'1Pd'},'2pe':{name:'II Pedro',abbr:'2Pd'},'1jo':{name:'I Juan',abbr:'1Jo'},'2jo':{name:'II Juan',abbr:'2Jo'},'3jo':{name:'III Juan',abbr:'3Jo'},jd:{name:'Judas',abbr:'Jd'},ap:{name:'Apocalipsis',abbr:'Ap'},
  },
};

for (const [locale, abbrevMap] of Object.entries(ABBREV_MAP)) {
  const srcPath = path.join(DATA_DIR, locale, '_source.json');
  if (!fs.existsSync(srcPath)) { console.log('No source for ' + locale + ' - skipping.'); continue; }

  console.log(`Processing ${locale}...`);
  let raw = fs.readFileSync(srcPath, 'utf8');
  if (raw.charCodeAt(0) === 0xfeff) raw = raw.slice(1);
  const data = JSON.parse(raw);

  let totalVerses = 0;
  let skipped = 0;

  for (const book of data) {
    const srcAbbrev = book.abbrev;
    const canonAbbrev = abbrevMap[srcAbbrev];
    if (!canonAbbrev) { skipped++; continue; }

    const pos = CANON_POS[canonAbbrev];
    const names = BOOK_NAMES[locale][canonAbbrev];
    if (!pos || !names) { skipped++; continue; }

    const bookFile = {
      name: names.name,
      abbreviation: names.abbr,
      testament: testament(pos),
      position: pos,
      chapters: book.chapters,
    };

    fs.writeFileSync(path.join(DATA_DIR, locale, canonAbbrev + '.json'), JSON.stringify(bookFile), 'utf8');
    totalVerses += book.chapters.reduce((s, ch) => s + ch.length, 0);
  }

  fs.unlinkSync(srcPath);
  console.log(`  ${locale}: ${data.length - skipped}/${data.length} books, ${totalVerses.toLocaleString()} verses`);
}

console.log('Done.');
