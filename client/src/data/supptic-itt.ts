/**
 * Programme du cycle des Ingénieurs des Travaux des Télécommunications (ITT) de SUP'PTIC.
 * Source : « Programmes de formation au cycle des ITT », année 2018-2019 (document fourni par
 * les étudiants). Les intitulés sont recopiés tels quels, avec l'orthographe corrigée.
 *
 * - S1 à S3 : tronc commun
 * - S4 : Informatique et Réseaux (IR) ou Radiocommunications / Réseaux et Télécoms (RC/RT)
 * - S5 et S6 : IR, RC ou RT
 *
 * `aliases` : manières dont les étudiants nomment la matière dans leurs fichiers (modèle SUP'DOCS :
 * « TS_Examen_CL_2024 », « Antennes_RAT_ALT_2023 », « Algèbre_II_Examen_2025 »…).
 * `activity` : élément sans cours à réviser (sport, discipline, stage…), masqué des matières.
 */

export type Specialty = "IR" | "RC" | "RT";
export type UECategory = "fondamentale" | "optionnelle" | "transversale";

export interface CurriculumEC {
  code: string | null;
  title: string;
  aliases?: string[];
  activity?: boolean;
}

export interface CurriculumUE {
  code: string;
  category: UECategory;
  credits: number;
  ecs: CurriculumEC[];
}

const ec = (code: string | null, title: string, ...aliases: string[]): CurriculumEC => ({ code, title, aliases });
const act = (code: string | null, title: string): CurriculumEC => ({ code, title, activity: true });
const ue = (code: string, category: UECategory, credits: number, ecs: CurriculumEC[]): CurriculumUE => ({
  code, category, credits, ecs,
});

const ENGLISH_PRO_S5 = ec("IT551", "Anglais / Français professionnel et de spécialité", "anglais");
const PROJECT_MGMT_S5 = ec("IT552", "Gestion des projets Télécoms et TIC", "gestion de projet", "gestion des projets");
const REGULATION_S5 = ec("IT553", "Réglementation et régulation des Télécoms et TIC", "reglementation", "regulation");

export const SEMESTERS_COMMON: Record<1 | 2 | 3, CurriculumUE[]> = {
  1: [
    ue("IT11", "fondamentale", 5, [
      ec("IT111", "Analyse 1", "analyse i", "analyse"),
      ec("IT112", "Algèbre 1", "algebre i", "algebre"),
    ]),
    ue("IT12", "fondamentale", 7, [
      ec("IT121", "Optique", "optique"),
      ec("IT122", "Électromagnétisme et électrostatique", "electromagneto", "electromagnetisme", "electrostatique"),
      ec("IT123", "Électrocinétique et circuits électriques", "electrocinetique", "circuits electriques"),
    ]),
    ue("IT13", "fondamentale", 7, [
      ec("IT131", "Algorithmique et structure des données", "algo", "algorithmique", "asd"),
      ec("IT132", "Programmation (langage C)", "programmation c", "langage c", "c"),
    ]),
    ue("IT14", "fondamentale", 7, [
      ec("IT141", "Concepts fondamentaux des réseaux informatiques", "concepts", "cfri", "reseaux informatiques"),
      ec("IT142", "Architecture des ordinateurs et systèmes d’exploitation", "architecture", "se", "systemes d exploitation"),
    ]),
    ue("IT15", "transversale", 4, [
      ec("IT151", "Anglais / Français général 1", "anglais", "francais"),
      act("IT152", "Sport"),
      act("IT153", "Éducation civique"),
    ]),
  ],
  2: [
    ue("IT21", "fondamentale", 6, [
      ec("IT211", "Analyse 2", "analyse ii", "analyse"),
      ec("IT212", "Algèbre 2", "algebre ii", "algebre"),
    ]),
    ue("IT22", "fondamentale", 5, [
      ec("IT221", "Électronique de base", "electronique"),
      ec("IT222", "Électronique des fonctions", "electronique des fonctions"),
    ]),
    ue("IT23", "fondamentale", 7, [
      ec("IT231", "Technologies et applications Web", "web", "taw"),
      ec("IT232", "Concepts réseaux télécoms", "concepts reseaux telecoms", "crt"),
      ec("IT233", "Concepts fondamentaux en TAV", "tav"),
    ]),
    ue("IT24", "fondamentale", 3, [act("IT240", "Visite d’entreprise")]),
    ue("IT25", "optionnelle", 4, [
      ec("IT251", "Circuits logiques et algèbre de Boole", "circuits logiques", "logique", "boole"),
      ec(null, "Électrotechnique", "electrotechnique"),
    ]),
    ue("IT26", "transversale", 3, [
      ec("IT261", "Anglais / Français général 2", "anglais", "francais"),
      ec("IT262", "Techniques d’expression", "techniques d expression"),
    ]),
    ue("IT27", "transversale", 2, [act("IT171", "Sport"), act("IT172", "Discipline")]),
  ],
  3: [
    ue("IT31", "fondamentale", 6, [
      ec("IT311", "Traitement du signal", "ts", "signal"),
      ec("IT312", "Antennes et propagation", "antennes", "ap", "propagation"),
    ]),
    ue("IT32", "fondamentale", 7, [
      ec("IT321", "Microcontrôleur", "microcontroleur", "micro", "mc"),
      ec("IT322", "Électronique de puissance", "electronique de puissance", "ep", "puissance"),
      ec("IT323", "Énergie et protection des réseaux", "energie", "protection des reseaux"),
    ]),
    ue("IT33", "fondamentale", 5, [
      ec("IT331", "Systèmes d’information et bases de données", "si", "sibd", "bd", "bases de donnees", "systemes d information"),
      ec("IT332", "Programmation orientée objet", "poo", "java"),
    ]),
    ue("IT34", "fondamentale", 6, [
      ec("IT341", "Probabilités et statistiques", "proba", "probabilites", "stats", "statistiques", "ps"),
      ec("IT342", "Théorie des graphes et recherche opérationnelle", "graphes", "ro", "tgro", "recherche operationnelle"),
    ]),
    ue("IT35", "transversale", 4, [
      ec("IT351", "Techniques de recherche documentaire", "recherche documentaire", "trd"),
      ec("IT352", "Anglais / Français technique", "anglais", "francais"),
      ec("IT353", "Introduction à la comptabilité", "comptabilite", "compta"),
    ]),
    ue("IT36", "transversale", 2, [act("IT361", "Sport"), act("IT362", "Discipline")]),
  ],
};

const S4_SHARED_END: CurriculumUE[] = [
  ue("IT45", "optionnelle", 5, [
    ec("IT451", "Organisation des Télécoms et TIC", "organisation des telecoms"),
    ec("IT452", "Anglais / Français professionnel", "anglais", "francais"),
    ec("IT453", "Management", "management"),
  ]),
  ue("IT46", "transversale", 2, [act("IT461", "Sport"), act("IT462", "Discipline")]),
];

const S4_START = (thirdUeFirstEc: CurriculumEC): CurriculumUE[] => [
  ue("IT41", "fondamentale", 5, [
    ec("IT411", "Asservissement et régulation", "asservissement", "regulation"),
    ec("IT412", "Électronique des télécommunications", "electronique des telecommunications", "electronique des telecoms"),
  ]),
  ue("IT42", "fondamentale", 5, [
    ec("IT421", "Techniques de commutation", "commutation"),
    ec("IT422", "Signalisation et réseaux intelligents", "signalisation", "reseaux intelligents"),
  ]),
  ue("IT43", "fondamentale", 5, [
    thirdUeFirstEc,
    ec("IT432", "Techniques et supports de transmission (FH, FO, Sat…)", "supports de transmission", "transmission"),
  ]),
  ue("IT44", "fondamentale", 5, [
    ec("IT441", "Protocoles réseaux informatiques", "protocoles reseaux"),
    ec("IT442", "Bases de la sécurité des réseaux et systèmes", "securite"),
  ]),
];

export const SEMESTER_4: Record<"IR" | "RCRT", CurriculumUE[]> = {
  IR: [
    ...S4_START(ec("IT431", "Protocoles d’applications", "protocoles d applications")),
    ...S4_SHARED_END,
    ue("IT47", "transversale", 3, [act("IT470", "Stage en entreprise")]),
  ],
  RCRT: [
    ...S4_START(ec("IT431", "Architecture et fonctions des réseaux", "architecture des reseaux")),
    ...S4_SHARED_END,
    ue("IT47", "transversale", 3, [act("IT470", "Stage professionnel")]),
  ],
};

export const SEMESTER_5: Record<Specialty, CurriculumUE[]> = {
  IR: [
    ue("IT51", "fondamentale", 6, [
      ec("IT511", "Sécurité avancée des réseaux et systèmes", "securite avancee", "securite"),
      ec("IT512", "Administration systèmes et réseaux", "administration", "asr"),
    ]),
    ue("IT52", "fondamentale", 6, [
      ec("IT521", "Programmation et applications réseaux", "programmation reseaux", "par"),
      ec("IT522", "Applications client-serveur", "client serveur"),
      ec("IT523", "Bases de données avancées 1 et analyse des données", "bda", "bases de donnees avancees", "analyse des donnees"),
    ]),
    ue("IT53", "fondamentale", 5, [
      ec("IT531", "Systèmes embarqués temps réel", "systemes embarques", "embarque"),
      ec("IT532", "Développement de services et applications mobiles", "mobile", "applications mobiles", "android"),
    ]),
    ue("IT54", "fondamentale", 6, [
      ec("IT541", "IHM", "ihm"),
      ec("IT542", "Cloud computing", "cloud"),
    ]),
    ue("IT55", "transversale", 5, [ENGLISH_PRO_S5, PROJECT_MGMT_S5, REGULATION_S5]),
    ue("IT56", "transversale", 2, [act("IT561", "Sport"), act("IT562", "Discipline")]),
  ],
  RC: [
    ue("IT51", "fondamentale", 6, [
      ec("IT511", "Réseaux mobiles : principes et normes", "reseaux mobiles"),
      ec("IT512", "Développement de services et applications mobiles", "mobile", "applications mobiles", "android"),
    ]),
    ue("IT52", "fondamentale", 6, [
      ec("IT521", "Système d’information géographique et cartographie", "sig", "cartographie"),
      ec("IT522", "Programmation et applications réseaux", "programmation reseaux"),
    ]),
    ue("IT53", "fondamentale", 6, [
      ec("IT531", "Systèmes de radiocommunications privées", "radiocoms privees", "pmr"),
      ec("IT532", "Optimisation et planification des réseaux", "optimisation", "planification"),
    ]),
    ue("IT54", "fondamentale", 5, [
      ec("IT541", "Évolution des réseaux et des services", "evolution des reseaux"),
      ec("IT542", "Dimensionnement et optimisation des réseaux radiomobiles", "dimensionnement"),
    ]),
    ue("IT55", "transversale", 5, [ENGLISH_PRO_S5, PROJECT_MGMT_S5, REGULATION_S5]),
    ue("IT56", "transversale", 2, [act("IT561", "Sport"), act("IT562", "Discipline")]),
  ],
  RT: [
    ue("IT51", "fondamentale", 8, [
      ec("IT511", "Technologies large bande", "large bande"),
      ec("IT512", "Évolution des réseaux et services", "evolution des reseaux"),
    ]),
    ue("IT52", "fondamentale", 7, [
      ec("IT513", "Optimisation et planification des réseaux", "optimisation", "planification"),
      ec("IT521", "Étude et ingénierie des réseaux d’accès", "reseaux d acces"),
      ec("IT522", "Communications par satellite", "satellite"),
    ]),
    ue("IT53", "fondamentale", 8, [
      ec("IT531", "PABX et réseaux PABX", "pabx"),
      ec("IT532", "Techniques avancées de multiplexage", "multiplexage"),
      ec("IT533", "Étude et exploitation des systèmes de commutation (Alcatel, Ericsson)", "systemes de commutation"),
    ]),
    ue("IT54", "transversale", 5, [
      { ...ENGLISH_PRO_S5, code: "IT541" },
      { ...PROJECT_MGMT_S5, code: "IT542" },
      { ...REGULATION_S5, code: "IT543" },
    ]),
    ue("IT55", "transversale", 2, [act("IT551", "Sport"), act("IT552", "Discipline")]),
  ],
};

const ROUTING = ec("IT611", "Routage et interconnexion des réseaux et services", "routage");
const QOS = (code: string) => ec(code, "Qualité de service et performance des réseaux", "qos", "qualite de service");
const JOB_SEARCH = (code: string) => act(code, "Techniques de recherche d’emploi / stage");

export const SEMESTER_6: Record<Specialty, CurriculumUE[]> = {
  IR: [
    ue("IT61", "fondamentale", 15, [ROUTING, ec("IT612", "Génie logiciel", "genie logiciel", "gl")]),
    ue("IT62", "fondamentale", 8, [QOS("IT621"), JOB_SEARCH("IT622")]),
    ue("IT63", "fondamentale", 2, [act("IT631", "Discipline")]),
    ue("IT64", "fondamentale", 5, [act("IT641", "Insertion professionnelle (stage projet / PFE)")]),
  ],
  RC: [
    ue("IT61", "fondamentale", 9, [ROUTING, ec("IT612", "Réseaux mobiles par satellite", "satellite")]),
    ue("IT62", "fondamentale", 8, [
      ec("IT621", "Exploitation et maintenance des réseaux radio", "exploitation", "maintenance"),
      ec("IT622", "Conception et commissioning des sites radio", "commissioning", "sites radio"),
    ]),
    ue("IT63", "fondamentale", 6, [QOS("IT631"), JOB_SEARCH("IT632")]),
    ue("IT64", "fondamentale", 2, [act("IT641", "Discipline")]),
    ue("IT65", "fondamentale", 5, [act("IT651", "Insertion professionnelle (stage projet)")]),
  ],
  RT: [
    ue("IT61", "fondamentale", 9, [ROUTING, ec("IT612", "Communications par fibres optiques", "fibre", "fibres optiques", "fo")]),
    ue("IT62", "fondamentale", 8, [
      ec("IT621", "Exploitation et maintenance des systèmes de télécoms", "exploitation", "maintenance"),
      ec("IT622", "Génie civil dans les réseaux de télécoms", "genie civil", "geniecivil"),
    ]),
    ue("IT63", "fondamentale", 6, [QOS("IT631"), JOB_SEARCH("IT632")]),
    ue("IT64", "fondamentale", 2, [act("IT641", "Discipline")]),
    ue("IT65", "fondamentale", 5, [act("IT651", "Insertion professionnelle (stage projet) / PFE")]),
  ],
};
