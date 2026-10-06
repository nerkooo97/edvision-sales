// Reference data for cleaning client addresses: countries, BiH regions and known city spellings.

export const COUNTRY_CODES = {
  'Bosnia and Herzegovina': 'BA',
  Austria: 'AT',
  Croatia: 'HR',
  Finland: 'FI',
  Germany: 'DE',
  Netherlands: 'NL',
  Slovenia: 'SI',
  Switzerland: 'CH',
  'United States': 'US',
};

// Countries whose local numbers start with a trunk 0 (so "0..." can safely become "+<code> ...").
export const DIAL_CODES = { AT: '43', CH: '41', DE: '49', FI: '358', HR: '385', NL: '31', SE: '46', SI: '386' };

export const REGIONS = {
  TK: 'Tuzlanski kanton',
  KS: 'Kanton Sarajevo',
  ZDK: 'Zeničko-dobojski kanton',
  SBK: 'Srednjobosanski kanton',
  HNK: 'Hercegovačko-neretvanski kanton',
  ZHK: 'Zapadnohercegovački kanton',
  USK: 'Unsko-sanski kanton',
  RS: 'Republika Srpska',
  BD: 'Brčko distrikt',
};

// Spellings found in the source "kanton_drzava" column (lowercase) -> region key.
export const REGION_ALIASES = {
  tk: 'TK',
  'tuzlanski kanton': 'TK',
  sarajevo: 'KS',
  'sarajevski kanton': 'KS',
  'srajevski kanton': 'KS',
  'ze-do': 'ZDK',
  'zeničko-dobojski kanton': 'ZDK',
  rs: 'RS',
};

// Source region values that are not a region at all.
export const REGION_NOISE = new Set(['bosna i hercegovina', 'österreich', 'gr']);

// BiH city (lowercase) -> region key. Covers every BiH city present in the source file.
export const CITY_REGIONS = {
  'doboj istok': 'TK',
  gnojnica: 'TK',
  gradačac: 'TK',
  gračanica: 'TK',
  kladanj: 'TK',
  lukavac: 'TK',
  miričina: 'TK',
  puračić: 'TK',
  srebrenik: 'TK',
  'stjepan polje': 'TK',
  tuzla: 'TK',
  živinice: 'TK',
  ilidža: 'KS',
  'novo sarajevo': 'KS',
  sarajevo: 'KS',
  jelah: 'ZDK',
  maglaj: 'ZDK',
  tešanj: 'ZDK',
  zenica: 'ZDK',
  bugojno: 'SBK',
  busovača: 'SBK',
  'donji vakuf': 'SBK',
  travnik: 'SBK',
  vitez: 'SBK',
  blagaj: 'HNK',
  mostar: 'HNK',
  grude: 'ZHK',
  'velika kladuša': 'USK',
  'banja luka': 'RS',
  boljanić: 'RS',
  derventa: 'RS',
  doboj: 'RS',
  modriča: 'RS',
  petrovo: 'RS',
  prijedor: 'RS',
  teslić: 'RS',
  brčko: 'BD',
};

// Misspelled or decorated city names (lowercase) -> correct name.
export const CITY_FIXES = {
  'des miones': 'Des Moines',
  'doboj - istok': 'Doboj Istok',
  'doboj istok': 'Doboj Istok',
  gnojica: 'Gnojnica',
  lukvac: 'Lukavac',
  malmo: 'Malmö',
  sreberenik: 'Srebrenik',
  srebenik: 'Srebrenik',
  'wien osterreich': 'Wien',
};
