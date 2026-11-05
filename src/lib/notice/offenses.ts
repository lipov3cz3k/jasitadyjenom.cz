// Catalogue of the most common stopping and parking offences.
// Provisions verified against the text of Act No. 361/2000 Coll. (zakonyprolidi.cz, 11/2026).

export type OffenseId =
  | "chodnik"
  | "prechod"
  | "krizovatka"
  | "vjezd"
  | "vyhrazene"
  | "zastavka"
  | "cyklopruh"
  | "zelen"
  | "znacka"
  | "protismer"
  | "volny-pruh"
  | "jine";

export interface Offense {
  id: OffenseId;
  label: string;
  /** Violated provision of Act No. 361/2000 Coll.; `null` = the user describes it. */
  provision: string | null;
  /** Factual description for the notice text. */
  fact: string | null;
}

export const OFFENSES: Offense[] = [
  {
    id: "chodnik",
    label: "Stání na chodníku",
    provision: "§ 53 odst. 2",
    fact: "Vozidlo stálo na chodníku, který smějí užívat pouze chodci.",
  },
  {
    id: "prechod",
    label: "Na přechodu pro chodce nebo méně než 5 m před ním",
    provision: "§ 27 odst. 1 písm. c)",
    fact: "Vozidlo stálo na přechodu pro chodce nebo ve vzdálenosti kratší než 5 m před ním.",
  },
  {
    id: "krizovatka",
    label: "Na křižovatce nebo méně než 5 m od ní",
    provision: "§ 27 odst. 1 písm. d)",
    fact: "Vozidlo stálo na křižovatce nebo ve vzdálenosti kratší než 5 m od hranice křižovatky.",
  },
  {
    id: "vjezd",
    label: "Před vjezdem",
    provision: "§ 27 odst. 1 písm. n)",
    fact: "Vozidlo stálo před vjezdem na pozemní komunikaci z místa ležícího mimo pozemní komunikaci.",
  },
  {
    id: "vyhrazene",
    label: "Na vyhrazeném parkovišti (např. pro osoby se zdravotním postižením)",
    provision: "§ 27 odst. 1 písm. o)",
    fact: "Vozidlo stálo na vyhrazeném parkovišti, přestože nejde o vozidlo, pro které je parkoviště vyhrazeno.",
  },
  {
    id: "zastavka",
    label: "V zastávce autobusu, tramvaje nebo trolejbusu",
    provision: "§ 27 odst. 1 písm. f)",
    fact: "Vozidlo stálo v úseku zastávky veřejné hromadné dopravy.",
  },
  {
    id: "cyklopruh",
    label: "Ve vyhrazeném pruhu nebo v pruhu pro cyklisty",
    provision: "§ 27 odst. 1 písm. i)",
    fact: "Vozidlo stálo ve vyhrazeném jízdním pruhu nebo v jízdním pruhu pro cyklisty.",
  },
  {
    id: "zelen",
    label: "Na trávníku nebo jiné zeleni u silnice",
    provision: "§ 27 odst. 1 písm. r)",
    fact: "Vozidlo stálo na silniční vegetaci, aniž by to bylo povoleno místní úpravou provozu.",
  },
  {
    id: "znacka",
    label: "V zákazu zastavení nebo stání (značka, žlutá čára)",
    provision: "§ 4 písm. c)",
    fact: "Vozidlo stálo v místě, kde dopravní značení zakazuje zastavení nebo stání.",
  },
  {
    id: "protismer",
    label: "Vlevo ve směru jízdy na obousměrné ulici",
    provision: "§ 25 odst. 1 písm. a)",
    fact: "Vozidlo stálo na obousměrné pozemní komunikaci vlevo ve směru jízdy.",
  },
  {
    id: "volny-pruh",
    label: "Nezůstal volný jízdní pruh 3 m",
    provision: "§ 25 odst. 3",
    fact: "U stojícího vozidla nezůstal volný jízdní pruh široký nejméně 3 m pro každý směr jízdy.",
  },
  {
    id: "jine",
    label: "Jiné – popíšu vlastními slovy",
    provision: null,
    fact: null,
  },
];

export function offenseById(id: OffenseId): Offense {
  const offense = OFFENSES.find((o) => o.id === id);
  if (!offense) throw new Error(`Neznámý přestupek ${id}`);
  return offense;
}
