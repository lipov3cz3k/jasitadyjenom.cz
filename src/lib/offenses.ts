// Common parking offenses with verbatim quotes from Act No. 361/2000 Coll.
// (version in force from 2026-01-01). "…" marks an omission. Anchors point to
// the exact paragraph/letter on zakonyprolidi.cz.

export const LAW_NAME = "zákon č. 361/2000 Sb.";

export type Offense = {
  title: string;
  citation: string;
  quote: string;
  url: string;
};

export const offenses: Offense[] = [
  {
    title: "Stání na chodníku",
    citation: "§ 53 odst. 2",
    quote: "Jiní účastníci provozu na pozemních komunikacích než chodci nesmějí chodníku nebo stezky pro chodce užívat, pokud není v tomto zákoně stanoveno jinak…",
    url: "https://www.zakonyprolidi.cz/cs/2000-361#p53-2",
  },
  {
    title: "Parkování v protisměru",
    citation: "§ 25 odst. 1 písm. a)",
    quote: "Řidič smí zastavit a stát jen vpravo ve směru jízdy co nejblíže k okraji pozemní komunikace a na jednosměrné pozemní komunikaci vpravo i vlevo.",
    url: "https://www.zakonyprolidi.cz/cs/2000-361#p25-1-a",
  },
  {
    title: "Stání v křižovatce",
    citation: "§ 27 odst. 1 písm. d)",
    quote: "Řidič nesmí zastavit a stát na křižovatce a ve vzdálenosti kratší než 5 m před hranicí křižovatky a 5 m za ní…",
    url: "https://www.zakonyprolidi.cz/cs/2000-361#p27-1-d",
  },
  {
    title: "Stání na přechodu nebo těsně před ním",
    citation: "§ 27 odst. 1 písm. c)",
    quote: "Řidič nesmí zastavit a stát na přechodu pro chodce nebo na přejezdu pro cyklisty a ve vzdálenosti kratší než 5 m před nimi.",
    url: "https://www.zakonyprolidi.cz/cs/2000-361#p27-1-c",
  },
  {
    title: "Stání mimo parkoviště v obytné zóně",
    citation: "§ 39 odst. 5",
    quote: "V obytné zóně a pěší zóně … Stání je dovoleno jen na místech označených jako parkoviště.",
    url: "https://www.zakonyprolidi.cz/cs/2000-361#p39-5",
  },
  {
    title: "Stání před vjezdem",
    citation: "§ 27 odst. 1 písm. n)",
    quote: "Řidič nesmí zastavit a stát před vjezdem na pozemní komunikaci z polní nebo lesní cesty nebo z místa ležícího mimo pozemní komunikaci.",
    url: "https://www.zakonyprolidi.cz/cs/2000-361#p27-1-n",
  },
  {
    title: "Neprůjezdná ulice (méně než 3 m)",
    citation: "§ 25 odst. 3",
    quote: "Při stání musí zůstat volný alespoň jeden jízdní pruh široký nejméně 3 m pro každý směr jízdy…",
    url: "https://www.zakonyprolidi.cz/cs/2000-361#p25-3",
  },
  {
    title: "Stání na trávě",
    citation: "§ 27 odst. 1 písm. r)",
    quote: "Řidič nesmí zastavit a stát na silniční vegetaci, pokud to není povoleno místní úpravou provozu na pozemní komunikaci.",
    url: "https://www.zakonyprolidi.cz/cs/2000-361#p27-1-r",
  },
  {
    title: "Stání na zastávce MHD",
    citation: "§ 27 odst. 1 písm. f)",
    quote: "Řidič nesmí zastavit a stát u zastávky tramvaje, autobusu nebo trolejbusu bez nástupního ostrůvku…",
    url: "https://www.zakonyprolidi.cz/cs/2000-361#p27-1-f",
  },
  {
    title: "Vyhrazené parkoviště (např. pro ZTP)",
    citation: "§ 27 odst. 1 písm. o)",
    quote: "Řidič nesmí zastavit a stát na vyhrazeném parkovišti, nejde-li o vozidlo, pro které je parkoviště vyhrazeno…",
    url: "https://www.zakonyprolidi.cz/cs/2000-361#p27-1-o",
  },
  {
    title: "Stání v cyklopruhu",
    citation: "§ 27 odst. 1 písm. i)",
    quote: "Řidič nesmí zastavit a stát ve vyhrazeném jízdním pruhu a jízdním pruhu pro cyklisty.",
    url: "https://www.zakonyprolidi.cz/cs/2000-361#p27-1-i",
  },
  {
    title: "Stání ve druhé řadě",
    citation: "§ 25 odst. 1 písm. b)",
    quote: "Řidič smí zastavit a stát jen v jedné řadě a rovnoběžně s okrajem pozemní komunikace…",
    url: "https://www.zakonyprolidi.cz/cs/2000-361#p25-1-b",
  },
];
