# JudoAdmin – specifikace nové správy klubu JUDO BESKYDY z.s.

Stav: pracovní verze 0.1 (1. 11. 2026). Zdroj: analýza stávající správy sprava-judobeskydy.cz (Joomla + Community Builder, úprava 2015) po přihlášení do čtení. Do dokumentu nejsou přepsána žádná osobní data členů.

## 1. Cíl a rozhodnutí

- Nová webová aplikace pro kompletní správu klubu: členové, trenéři, rodiče, akce a přihlášky, závody, kempy a přespávačky, bodování, aktuality.
- Vývoj na free hostingu, finální umístění se rozhodne později.
- **Platforma:** responzivní web, mobile-first, instalovatelný jako PWA (iPhone i Android, ikona na ploše). Nativní aplikace zatím ne. Důvod: jedna codebase, žádné obchody s aplikacemi, snadné nasazování. Push notifikace se dají přidat později (na iOS PWA fungují po přidání na plochu).
- Začínáme funkčně stejně jako stávající systém, pak vylepšujeme.

## 2. Role a oprávnění

Dnes: jeden sdílený účet celého klubu, takže každý vidí vše. V nové aplikaci:

| Role | Co smí |
|---|---|
| Veřejnost | Aktuality, kalendář akcí, propozice, žebříčky (bez příjmení dětí, nebo zkrácené podle rozhodnutí klubu), přihláška do klubu |
| Rodič | Vlastní děti, jejich přihlášky na akce, odhlášení, výsledky a body dětí |
| Trenér | Členové své základny, přihlášky své základny, zápis výsledků a docházky |
| Admin | Vše: členové, akce, bodování, aktuality, číselníky, role |

Poznámka: děti a e-maily rodičů jsou osobní údaje (GDPR), role nejsou volitelné.

## 3. Moduly a stávající funkce

### 3.1 Členové
- Seznam (cca 583 členů), stránkování, vyhledávání.
- Pole: příjmení, jméno, kategorie, kyu (stupeň), základna. Rok narození se používá při přihlášce na akce.
- Kategorie: U8, U10, U12, U14, U16, U18, Dospělí. Pravděpodobně se odvozuje z věku (ověřit).
- Základny: Raškovice, Dobrá, Frýdek-Místek, Frýdlant nad Ostravicí, Brušperk, Dolní Domaslavice, Fryčovice, Hnojník, Komorní Lhotka, Morávka, Nošovice, Palkovice, Řepiště, Střítěž (+ "Ostatní" pro hosty).
- Nový člen se zapíše do výsledků jako "Vítáme nového uživatele" s 0 body.
- Přihláška do klubu je mimo systém (externí Judo Gate, gate.czechjudo.org).

### 3.2 Akce a kalendář
- Kalendář akcí (měsíční mřížka), tabulka "Blížící se akce", Kalendář soustředění, Kalendář turnajů, Archív. Komponenta: JEM (Joomla Event Manager).
- Detail akce: název, datum od–do, kategorie (např. "Naše turnaje"), místo konání a město (v ukázkách prázdné), popis, odkaz na pozvánku/rozpis nebo propozice (PDF nebo obrázek).
- Z kalendáře se dá kliknout na detail a z něj na propozice a registraci.
- Typy akcí: turnaj, přespávačka, kemp/soustředění, mistrovství klubu, mezinárodní turnaj, klubová akce.

### 3.3 Registrace na akce
- Veřejný formulář: příjmení a jméno, hmotnost závodníka, rok narození, e-mail, oddíl (základna nebo Ostatní), akce (výběr z nadcházejících), počet účastníků (jen pro oddíl Ostatní), heslo pro smazání.
- Přehled "Stav registrace": přihlášení po akcích, pořadí, oddíl, účastník, rok narození, počet přihlášených a maximum (100), smazání heslem.
- Nedostatky: poznámky ("jen pátek", "bez přespání") se píšou do jména, duplicity (stejný člověk dvakrát), smazání jen heslem.
- Nově: výběr člena z databáze, strukturovaná pole (přespání ano/ne, dny), kontrola duplicit, kapacita a pořadník, potvrzovací e-mail, odhlášení rodičem, export pro trenéra a pořadatele.

### 3.4 Výsledky a bodování
- Výsledky po akcích: datum, název akce, jméno, kategorie, věk, umístění, body, výhry.
- Přespávačky a kempy: 15 bodů za účast (do aktivity).
- Žebříčky:
  - Hodnocení po kategoriích: pořadí, jméno, kategorie, body, zápasy, výhry, úspěšnost, výkonnost, aktivita, "body NA". Filtr: základna a rok (2023–2026).
  - Tabulka bez kategorií.
  - Tabulka aktivit (docházka a kempy).
- **Pravidla bodování (zdroj: judobeskydy.cz, Metodika, stránky 03 a 08):**
  - Bodování hodnotí zodpovědný přístup, cílevědomost a aktivitu, ne celkovou kvalitu výsledku. Cíl: motivace i pro nejmladší.
  - Účast na soutěži: 2 body ("cena útěchy", medailisté je nedostávají). Vyhraný zápas: 1 bod.
  - Mezinárodní soutěž, VC, ČP: pavouk 1. místo 10 b, 2. místo 5 b, 3. místo 3 b; tabulka 5 / 3 / 2 b.
  - Malá cena, domácí přátelské turnaje, KP: pavouk 5 / 3 / 2 b; tabulka 3 / 2 / 1 b.
  - MČR a světové poháry (EFJu, ČSJu): pavouk 1. místo 30 b, 2. místo 20 b, 3. místo 10 b, 5. místo 5 b, 7. místo 3 b; tabulka 20 / 10 / 5 / 3 b (1.–4. místo).
  - Soustředění, tábor, ukázky: 10 b za účast. Přespávačky: v praxi 15 b (rozpor s textem, potvrdit).
  - Body se mohou upravit podle kvality turnaje, počtu a kvality soupeřů, vyšších kategorií. Sníženy při jediném soupeři, kontumaci nebo nevhodném chování na soustředění či táboře.
  - Od roku 2017 je platný "nový systém" se šesti typy hodnocení podle kritérií akce. Přesná tabulka je níže (Excel `bodovani2017.xls`, jeden list "Bodování 2017", 39 kB).
  - Ocenění: nejúspěšnější judista v každé kategorii a základně dostává trofej. Navíc putovní pohár starosty v Dobré a v Raškovicích. Síň slávy: medailisté mistrovských soutěží v kategorii jednotlivců.
- **Bodovací systém 2017 (z Excelu), závazná varianta pro implementaci:**

  *Krok 1 – určení kategorie závodu.* Sečtou se hodnotící čísla splněných kritérií:

  | Kritérium | Hodnotící číslo |
  |---|---|
  | 2–3 účastníci | 1 |
  | 4–5 účastníků | 2 |
  | 6–12 účastníků | 3 |
  | 13 a více účastníků | 4 |
  | Mezinárodní účast | +2 |
  | Mezinárodní účast více než tří států | +4 |
  | Zahraniční turnaj | +3 |
  | Český pohár | +2 |
  | Krajský přebor | +2 |
  | Mistrovství republiky | +5 |

  Minimum 1, maximum 13. Kategorie závodu podle součtu: Kat. I od 1, Kat. II od 2, Kat. III od 6, Kat. IV od 9, Kat. V od 13. Mistrovství klubu je samostatný typ. (Formulace "sečtou se splněná kritéria" v Excelu nerozlišuje, zda se kritéria počtu účastníků sčítají, nebo bere jen jedno. Ověřit, zda stačí jedno z řádků "účastníci".)

  *Krok 2 – body podle umístění a výsledků:*

  | | Mistr. klubu | Kat. I | Kat. II | Kat. III | Kat. IV | Kat. V |
  |---|---|---|---|---|---|---|
  | 1. místo | 25 | 15 | 25 | 35 | 50 | 80 |
  | 2. místo | 15 | 10 | 15 | 25 | 35 | 50 |
  | 3. místo | 10 | 5 | 10 | 15 | 25 | 35 |
  | 5. místo | – | – | – | 10 | 15 | 25 |
  | 7. místo | – | – | – | – | 10 | 15 |
  | 9. místo | – | – | – | – | – | 10 |
  | Cena útěchy (účast) | – | 0 | 3 | 3 | 4 | 5 |
  | Body za výhru | 5 | 3 | 5 | 10 | 15 | 20 |
  | Body za vydřenou prohru | 2 | – | 3 | 5 | 7 | 10 |
  | Závody družstev | – | – | 5 | 10 | 15 | 20 |

  Ověření na datech: Sosnowiec 11. 10. 2026, 1. místo se 3 výhrami = 35 + 3×10 = 65 b (Kat. III). VC Ostrava, 1. místo se 4 výhrami = 50 + 4×15 = 110 b (Kat. IV).

  *Krok 3 – aktivity (docházka a práce pro klub, tabulka Aktivity):*
  - Ukázky juda: 15 b. Focení na závodech (redakční práce): 5 b. Asistence na závodech: 15 b.
  - Soustředění: dle délky a uvážení trenéra, 5 b za den. Tábor: 50 b dle chování.
  - Preferenční body za "Kytici juda": dle délky a uvážení trenéra, max 50 b.
  - V praxi: Přespávačka 15 b.
- **Stále otevřené:** definice sloupců "výkonnost", "body NA" a "úspěšnost" (v Excelu nejsou). Hypotéza: úspěšnost = výhry / zápasy, což u některých řádků vychází přes 100 %, takže je ve výsledcích nejspíš chyba v evidenci zápasů. Chybí tabulka pro starší soutěže s označením "pavouk" a "tabulka" (v textu na webu), která se do systému 2017 nepromítá. Ověřit u správce, který systém platí.

### 3.5 Aktuality a obsah
- Články s datem, krátkým textem, PDF přílohami (hodnocení kempů), tiskem, PDF a e-mailem.
- Síň slávy.
- Hlavní klubový web `judobeskydy.cz` (WordPress) je samostatný: novinky, Metodika a zkušební řád (16 stránek), Judo shop, galerie (Zonerama), podpora klubu, kontakty. Správa (`sprava-judobeskydy.cz`) se z něj otevírá jako "Správa, kalendář akcí, bodování". Nová aplikace zatím nahrazuje jen správu, hlavní web může zůstat.

### 3.6 Směrnice členství (platná od 1. 5. 2025)
Vyhotovil Luděk Kubíček, přezkoušela Pavla Prőllová, uvedl v platnost Plénum trenérů spolku. 4 strany, 5 článků.

- **Čl. I – přijetí do klubu:** členem může být zájemce od 4 let. Zájemce si nejdřív zkusí trénink, pak vyplní elektronickou registraci a potvrdí seznámení se směrnicemi. Při pokračování se platí vstupní částka 100 Kč a od třetího tréninku je zájemce členem včetně plateb. Nábor probíhá celoročně. Člen vybírá trénink 1x týdně na jedné základně (tzv. rekreační sportovec = Zafír). Většina sportovců by měla trénovat nejméně 2x týdně na své základně. Skupina tzv. Hurikáni má výkonnostní zaměření. Příspěvky a úřední info jsou na judobeskydy.cz.
- **Čl. II – povinnosti člena:** účast na soutěžích klubových, regionálních, celostátních a mezinárodních. Minimálně 1x za půl roku domácí soutěž Mistrovství klubu (pro začátečníky, 5x ročně, 4 cvičné zápasy a odměna). Minimálně 1x za půl roku Přespávačka (celkem asi 40 za rok). Při nesplnění účasti na těchto akcích končí členství. Pro předškolní děti povinnosti neplatí.
- **Čl. III – zákonní zástupci:** právo znát podmínky, vyjadřovat se, upozornit trenéra na problémové dítě. Povinnost zajistit docházku, omlouvat neúčast na trénincích a akcích, oznámit ukončení členství (zbytek členských a licenčních poplatků se doplatí).
- **Čl. IV – závodní tým:** člen nebo zástupce dá vědět klubu, kam se chystá na turnaj či kemp, konzultuje samostatné akce s hlavním trenérem. Na turnaje a soustředění se členové hlásí elektronicky (registrace na AKCE). Při přestupu do jiného klubu oznámit klubu, klub může požadovat výchovné podle pravidel ČSJu nebo vázací smlouvy.
- **Čl. V – trenéři:** 13 základen, kvalifikovaní trenéři s licencí ČSJu, hlavní trenérka zodpovídá za chod. Povinnosti: nábor, asistenti, náhradní trenér, docházka a evidence omluv, evidence účasti na Mistrovství klubu a přespávačkách, upozorňování na nekázeň (po třetím upozornění lavička, opakovaně podnět vedení), hlášení zranění a škod. Práva: informace o členech základny, podněty, příspěvek na vzdělávání, zapůjčení vybavení.
- **Dopady na aplikaci:** evidence docházky na trénincích a omluv (trenér), kontrola splnění povinných akcí (Mistrovství klubu, Přespávačky) za půlrok, upomínky a stav členství, vstupní platba a členské příspěvky.
- **Bezpečnostní poznámka:** směrnice na veřejném PDF uvádí přihlašovací údaje do sdíleného účtu. Nová aplikace je nemá přebírat, každý uživatel má vlastní účet.

### 3.7 Technické stupně (kyu)
Žákovské stupně KYU a mistrovské DAN. Děti do 14 let mají půlené stupně (např. bílo-žlutý pásek), starší celé. Zkoušku vykonává cvičenec jen na doporučení osobního trenéra, o udělení rozhoduje zkušební komisař. Přespávačky slouží i jako příležitost pro zkoušky na vyšší KYU. V aplikaci: evidence kyu, historie zkoušek, doporučení trenéra, zkušební komisař.
- Odkazy na obce a partnery (Frýdek-Místek, Dobrá, Raškovice, Frýdlant nad Ostravicí).

## 4. Návrh datového modelu (první verze)

- `base` (základna): id, název
- `member`: id, příjmení, jméno, rok narození, kategorie, kyu, base_id, stav (aktivní/ukončen)
- `guardian` (rodič/zákonný zástupce) + vazba `member_guardian`
- `user`: e-mail, role, vazby na trenéra (base_id) a rodiče
- `event`: id, název, typ, od, do, místo, město, kapacita, popis, propozice_url, registrace_otevřena
- `registration`: id, event_id, member_id (nullable pro hosty), jméno hosta, oddíl, hmotnost, poznámky (noclehy, dny), stav, vytvořeno
- `result`: id, event_id, member_id, umístění, výhry, zápasy, body
- `points_rule`: pravidla bodování podle typu akce a umístění
- `season`: rok a uzávěrka
- `post` (aktuality): titulek, text, přílohy, publikováno
- `document`: směrnice, propozice, přílohy

## 5. Otevřené otázky

1. Definice sloupců "výkonnost", "body NA" a "úspěšnost" a které ze dvou bodovacích textů (starší text "pavouk/tabulka" na webu, nebo systém 2017 z Excelu) je platný. Excel bodovani2017.xls je zpracován v kap. 3.4.
2. Výše členských příspěvků a platební podmínky (směrnice odkazuje na judobeskydy.cz, sekce Příspěvky a úřední informace). Neprojito.
3. Jak se vypočítává kategorie a kyu, kdo je zadává.
4. Co je na subdoméně mx.sprava-judobeskydy.cz (odkaz v hlavičce stránky).
5. Rozdíl mezi stránkami Registrovaní NEW a staršími exporty; co dělá "Tabulka bez kategorií" (nebyla otevřena).
6. Soustředění (kalendář soustředění), Archív a Síň slávy zatím neprojity.
7. Mají se veřejné žebříčky zobrazovat s celými jmény dětí?
8. Příspěvky a platby: řeší se mimo systém?

## 6. Další kroky

1. Doplnit zbylé sekce (Síň slávy, Archív, soustředění, tabulka bez kategorií).
2. Přepsat směrnici (po dodání PDF).
3. Potvrdit pravidla bodování se správcem.
4. Kostra aplikace: autentizace a role, členové, akce, registrace, výsledky, žebříčky.
