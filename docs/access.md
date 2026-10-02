# Pristup po modulima

Svaki korisnik ima **ulogu u svakom modulu posebno** (Sales, Projekti) ili nema pristup tom modulu. Jedan
**glavni administrator** ima sve u svim modulima i jedini dodjeljuje pristup.

Uloge su Appwrite labeli na korisniku (po jedan za modul), pa stižu uz sesiju bez dodatnog upita u bazu.

| Modul | Uloge (labeli) |
|---|---|
| Glavni administrator | `orgadmin` (samo jedan račun) |
| Sales | `salesadmin`, `salesmanager`, `salesagent`, `salesviewer` |
| Projekti | `hubadmin`, `hubaccountmanager`, `hubprojectlead`, `hubteammember`, `hubfinance`, `hubviewer` |

## Glavni administrator
Postavlja se jednom, skriptom (radi samo dry run dok ne dodaš `--apply`, i odbija drugog administratora):

```bash
npm run access:org-admin -- email@domena.ba
npm run access:org-admin -- email@domena.ba --apply
```

Dodjela uloga ide na ekranu **Korisnici i pristup** (`/access`), vidljivom samo glavnom administratoru.

## Sales uloge: prekidač `SALES_ROLES_ENFORCED`
Dok varijabla okruženja `SALES_ROLES_ENFORCED` nije `true`, Sales radi **tačno kao prije**: svaki prijavljeni
korisnik ima pun pristup. Uloge za Projekte se primjenjuju odmah (Projekti su novi modul).

### Redoslijed puštanja (da niko ne ostane zaključan)
1. Deploy nove verzije s isključenim prekidačem (ponašanje salesa se ne mijenja).
2. Skriptom postavi glavnog administratora (ako već nije).
3. Na `/access` dodijeli Sales ulogu svakome kome treba Sales.
4. Uključi `SALES_ROLES_ENFORCED=true` i ponovo pokreni aplikaciju.
5. Ako nešto krene po zlu: ukloni varijablu i ponovo pokreni. Ništa se ne mijenja u bazi.

## Šta koja Sales uloga smije
| Dio salesa | Administrator | Manager | Agent | Posmatrač |
|---|---|---|---|---|
| Dashboard | pregled | pregled | pregled | pregled |
| Firme, Leadovi, Sastanci, Pozivi, Dnevnik kontakata | sve | sve | uređuje, bez brisanja | pregled |
| Email log, Pomoć | pregled | pregled | pregled | pregled |
| Izvještaji | pregled | pregled | ne | pregled |
| Automatizacije | upravlja | pregled | ne | ne |
| Podešavanja | da | ne | ne | ne |

Matrica je u `lib/access/sales-permissions.ts`.

## Šta provjera pokriva
- Sve Sales stranice (`requireSalesArea`), meni i **serverske funkcije** (`checkSalesAccess`), jer skrivanje
  stranice samo po sebi ne štiti podatke.
- **Namjerno bez provjere uloge:** API rute `whatsapp/send` (štiti ih vlastiti ključ za n8n), `track/open`
  (javni piksel za praćenje otvaranja mejlova) i `validate-email`.

## Dodavanje novog modula
Dodati jedan unos u `MODULES` u `lib/access/modules.ts` (naziv, uloge, labeli, opisi). Kolona u matrici se
pojavi sama; za novi modul je još potrebno napisati njegova pravila dozvola.
