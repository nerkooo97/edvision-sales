# ED Vision Sales — plan popravke n8n sistema

## Cilj

Osposobiti pouzdano automatsko pokretanje prodajnog procesa u 07:00, automatsko prepoznavanje odgovora klijenata, follow-up obradu i produkcijske webhookove. Sistem mora prijavljivati stvarne greške umjesto da neuspjele obrade prikazuje kao uspješne.

## Trenutno potvrđeno stanje

- [x] Workflow na n8n Cloud instanci postoji i API ga prikazuje kao `active: true`.
- [x] Timezone workflowa je `Europe/Sarajevo`.
- [x] Objavljena verzija sadrži ispravan Schedule Trigger za 07:00.
- [x] Trenutni draft i objavljena produkcijska verzija nisu isti.
- [x] Posljednja automatska trigger egzekucija zabilježena je 30.08.2026; 31.08.2026. i 01.09.2026. nije bilo automatskih trigger egzekucija.
- [x] Ručne i webhook egzekucije postoje, pa n8n instanca nije potpuno nedostupna.
- [x] Lokalni i GitHub workflow imaju istih 43 čvora, iste ID-eve i iste veze; razlikuju se prvenstveno stvarne tajne i placeholderi.
- [x] Lokalni tajni workflow i `.env.local` ispravno su isključeni iz Gita.
- [x] U drugim Git-tracked skriptama ipak postoje hardkodirani pristupni podaci.

## Kritični problemi

### P0 — Izloženi pristupni podaci

- [ ] Rotirati Appwrite API ključ koji je hardkodiran u praćenim skriptama.
- [x] Rotirati n8n korisničku lozinku koja je hardkodirana kao fallback u skriptama.
- [ ] Opozvati prethodni n8n API ključ nakon potvrde da produkcija koristi novi.
- [x] Rotirati i opozvati WhatsApp/OpenWA API ključ koji je bio hardkodiran u sanitizer skripti.
- [ ] Pregledati OpenAI, Slack, WhatsApp, SMTP/IMAP i ostale ključeve te rotirati svaki koji je ikada bio commitovan.
- [x] Ukloniti sve trenutno poznate stvarne tajne iz Git-tracked fajlova.
- [x] Zamijeniti hardkodirane vrijednosti environment varijablama.
- [x] Prepraviti sanitizer tako da ne sadrži stvarni ključ koji pokušava ukloniti.
- [x] Ukloniti hardkodirani produkcijski webhook URL iz aplikacije i testnih skripti.
- [x] Zaštititi n8n administrativne server akcije provjerom prijavljenog korisnika.
- [ ] Nakon rotacije očistiti Git historiju i ponovo skenirati cijeli repozitorij.
- [ ] Pregledati n8n i Appwrite pristupne/audit logove zbog moguće zloupotrebe.

Pogođene skripte trenutno uključuju:

- `scripts/add-bounce-handling.js`
- `scripts/fix-itk-music.js`
- `scripts/inspect-and-clean-false-errors.js`
- `scripts/run-followup-clean.js`
- `scripts/sanitize-github-workflow.js`
- `scripts/test-run-endpoint.js`
- `scripts/test-manual-trigger.js`
- `scripts/test-run-followup.js`
- `scripts/trigger-followup.js`
- `scripts/update-n8n-workflows.js`

### P0 — Workflow je označen kao aktivan, ali triggeri ne rade

- [ ] Sačuvati read-only backup trenutnog drafta i trenutno objavljene verzije sa n8n Cloud instance.
- [ ] Ne koristiti nasumično `Unpublish/Publish` prije backupa i pripremljenog plana povratka.
- [x] Napraviti minimalni testni workflow `Schedule Trigger -> No Operation` sa zasebnim ID-em.
- [x] Potvrditi da testni workflow stvara stvarnu `mode=trigger` egzekuciju.
- [ ] Ako ni testni workflow ne radi, otvoriti n8n Cloud support ticket za workspace-level scheduler/publication kvar.
- [ ] Od n8n podrške tražiti provjeru i ponovno registrovanje scheduler/publication stanja ili restart odgovarajućeg Cloud workera.
- [ ] Ako testni workflow radi, postojeći workflow kontrolisano klonirati na novi ID i tek tada izvršiti produkcijski cutover.
- [x] Poslije objave provjeriti da su `versionId` i `activeVersionId` usklađeni za verziju koja treba biti u produkciji.
- [x] Potvrditi stvarnu schedule i IMAP egzekuciju, ne samo oznaku `Published`.

Podaci za eventualni n8n support ticket:

- Instanca: `https://edvision.app.n8n.cloud`
- Workflow ID: `H8QDF031rHcFtBYA`
- Timezone: `Europe/Sarajevo`
- Trenutno stanje API-ja: `active: true`
- Draft version ID: `5f951d58-468f-44c2-86e7-661abc29bd09`
- Published version ID: `7d0f8cb2-4210-4b12-ba65-597b7fb652ab`
- Posljednja potvrđena automatska egzekucija: `2026-08-30T08:45:51.764Z`
- Očekivana egzekucija 01.09.2026. u 07:00 Europe/Sarajevo nije kreirana, čak ni kao neuspješna egzekucija.

Rezultat izolovanog testa 01.09.2026:

- zaseban workflow sa Schedule Triggerom svake minute proizveo je pet uspješnih `mode=trigger` egzekucija;
- n8n Cloud scheduler radi, pa nije potreban support ticket za workspace-level scheduler;
- glavni workflow je ponovo kontrolisano aktiviran, a njegova trenutna aktivna verzija je usklađena s draftom;
- stvarna 07:00 egzekucija glavnog workflowa mora se potvrditi sljedećeg jutra prije zatvaranja ovog problema.

### P0 — Odgovori klijenata se ne prepoznaju

- [x] Ukloniti pogrešne ulazne veze Schedule/Webhook -> `Email Trigger (IMAP)` i ostaviti IMAP kao samostalni trigger.
- [x] Preusmjeriti Schedule/Webhook follow-up grane direktno na obradu poslanih contact logova.
- [x] Potvrditi stvarnim testnim emailom da IMAP listener stvara `mode=trigger` egzekuciju bez WhatsApp ili lead-update akcija.
- [x] Popraviti reply i bounce Appwrite PATCH zahtjeve: tijelo sada koristi obavezni `data` objekt, a greške se više ne skrivaju pomoću `neverError`.
- [x] IMAP poruke nakon prijema označiti kao pročitane, bez praznog-output režima i bez skrivanja IMAP greške.
- [ ] Izdvojiti IMAP obradu u poseban workflow koji počinje direktno sa `Email Trigger (IMAP)` čvorom.
- [ ] Ukloniti povezivanje Schedule/Webhook čvora u IMAP trigger kao da je IMAP obična action operacija.
- [ ] Kada stigne email, iz njega prvo izdvojiti pošiljaoca, subject, datum i message/thread identifikatore.
- [ ] Tek nakon toga direktno pronaći odgovarajući contact log/lead u Appwriteu.
- [ ] Ne skenirati sve ulazne poruke za svaki contact log ako se kontakt može pronaći direktnim upitom.
- [ ] Sačuvati audit podatke o pronađenom odgovoru bez nepotrebnog spremanja kompletnog privatnog sadržaja poruke.
- [ ] Dodati idempotency zaštitu da ista poruka ne označi ili notificira isti lead više puta.
- [ ] Napraviti jednokratni mailbox backfill za odgovore pristigle dok IMAP listener nije radio.
- [ ] Backfill ograničiti datumom, folderom i pošiljaocima kako bi obrada bila kontrolisana.

Potvrđeni simptom iz egzekucija `182`, `185` i `186`:

- svaka egzekucija obradila je 25 contact logova;
- IMAP čvor u tim egzekucijama nije bio izvršen;
- matcher nije imao ulazne emailove;
- rezultat je bio 0 pronađenih odgovora i 0 bounce poruka.

### P1 — Appwrite upit obrađuje samo 25 contact logova

- [x] Zamijeniti obični `limit=100` parametar ispravnim Appwrite limit query izrazom.
- [x] Dodati cursor paginaciju za fallback upit: po 100 zapisa, najviše 10 stranica (1.000 zapisa).
- [ ] Testirati slučaj u kojem se traženi kontakt nalazi nakon prvih 25 i nakon prvih 100 zapisa.
- [x] Preferirati direktan upit po email adresi za IMAP odgovore, uz fallback na postojeću provjeru kada direktni lookup nema rezultat.
- [ ] Provjeriti sve vrijednosti statusa koje ulaze u obradu: `Poslano`, `Otvoreno`, `Otvorena` i eventualne stare varijante.

### P1 — Ručno pokretanje koristi zastarjela imena triggera

- [x] U `lib/n8n/client.ts` ukloniti reference na stare nazive:
  - `Schedule Trigger (09:00h)1`
  - `Schedule Trigger (10:00h Follow-up)1`
- [ ] Ručno pokretanje vezati za stabilne webhook puteve ili stabilne node ID-eve gdje je moguće.
- [x] Ne koristiti privatni n8n `/rest/.../run` endpoint kao primarni produkcijski mehanizam.
- [x] Ukloniti login n8n korisničkim emailom i lozinkom iz aplikacijskog backend koda.
- [ ] Testirati zasebno `outreach`, `followup` i `full` komande.
- [ ] Jasno prijaviti kada primary poziv ne uspije i kada se koristi fallback.

### P1 — Greške se prikrivaju kao uspješne egzekucije

- [x] Ukloniti `neverError: true` sa kritičnih reply/bounce Appwrite update zahtjeva.
- [ ] Ukloniti `neverError: true` sa preostalih kritičnih Appwrite create/update zahtjeva ili iza svakog zahtjeva provjeriti HTTP status i response body.
- [x] Ukloniti `alwaysOutputData: true` i `continueRegularOutput` s IMAP čvora.
- [ ] Ne pretvarati grešku čitanja IMAP izlaza u tihu praznu listu.
- [ ] Dodati Error Trigger workflow ili centralnu obradu grešaka.
- [ ] Za kritične kvarove poslati Slack obavijest sa workflowom, execution ID-em, čvorom i sažetkom greške bez tajnih podataka.
- [ ] Razlikovati `uspješno završeno`, `nema kandidata`, `nema novih poruka` i `tehnička greška`.

### P1 — WhatsApp follow-up je imao lažne zapise `Poslano`

- [x] Potvrditi da je OpenWA odbio 17:00 follow-up zbog neaktivne stare sesije, a da poruke nisu stvarno poslane.
- [x] Povezati n8n na trenutnu aktivnu OpenWA sesiju.
- [x] Zaustaviti workflow na OpenWA/Appwrite grešci umjesto evidentiranja lažnog `Poslano` statusa.
- [x] Slati samo ako nema odgovora/bouncea, prošla su četiri dana, postoji valjan BiH mobilni broj i nema ranijeg uspješnog WhatsApp follow-upa za kompaniju.
- [x] Označiti 52 dokazano neuspjela WhatsApp zapisa (01.09. 17:00 i 02.09. 07:30) kao `Greška`, uz backup prije izmjene.

### P1 — Monolitni workflow treba razdvojiti

- [ ] Workflow A — dnevni outreach:
  - Schedule Trigger u 07:00.
  - Dohvat kandidata i provjera postojećeg leada.
  - Validacija domene/emaila.
  - Generisanje i slanje emaila.
  - Evidencija u contact logu.
  - Kontrolisano ograničenje i razmak između slanja.
- [ ] Workflow B — inbound email/reply:
  - Email Trigger (IMAP) kao početni čvor.
  - Prepoznavanje reply/bounce poruke.
  - Direktno pronalaženje leada i contact loga.
  - Ažuriranje statusa i Slack obavijest.
- [ ] Workflow C — vremenski follow-up:
  - Schedule Trigger u 07:30 i 17:00.
  - Upit samo za kontakte koji još nisu odgovorili i ispunjavaju vremenski uslov.
  - WhatsApp follow-up uz idempotency i dnevni limit.
- [ ] Workflow D — tracking webhookovi, po mogućnosti odvojeno:
  - Email open tracking.
  - Stabilni webhook putevi.
  - Nezavisna dostupnost od outreach/IMAP publish problema.

### P1 — Sinhronizacija lokalnog JSON-a i n8n Clouda nije sigurna

- [ ] Prepraviti `scripts/push-workflow-to-n8n.js` da prvo napravi backup live verzije.
- [ ] Ne deaktivirati produkcijski workflow prije nego što je nova verzija validirana.
- [ ] Sačuvati i slati potrebne workflow settings, posebno timezone i execution postavke.
- [ ] Nakon PUT/objave ponovo dohvatiti workflow i uporediti node/connection hash.
- [ ] Provjeriti da li je objavljena upravo očekivana verzija, a ne samo da je `active=true`.
- [ ] Dodati health check produkcijskih webhookova i trigger registracije.
- [ ] Uvesti dry-run način koji samo poredi lokalnu i live verziju.
- [ ] Dokumentovati rollback na prethodni published version ID.

### P2 — Oštećeno kodiranje naziva čvorova

- [ ] Ispraviti nazive poput `RuÄŤni`, `AĹľuriraj` i slične UTF-8/mojibake vrijednosti.
- [ ] Uskladiti nazive u nodes, connections i svim n8n izrazima `$()`.
- [ ] Pretražiti aplikacijski i skriptni kod za reference na stare ili oštećene nazive.
- [ ] Gdje je moguće, izbjegavati poslovnu logiku koja zavisi od prikaznog imena čvora.
- [ ] Nakon ispravke pokrenuti validator veza za lokalni i sanitizovani JSON.

### P2 — Dodatno učvršćivanje sistema

- [ ] Isključiti `allowUnauthorizedCerts` za IMAP nakon potvrde ispravnog TLS certifikata servera.
- [ ] Uvesti dnevni send limit koji se provjerava na serveru, ne samo u UI-u.
- [ ] Spriječiti paralelna/dupla slanja istoj kompaniji.
- [ ] Dodati unique/idempotency ključ za contact log i outbound poruku.
- [ ] Sačuvati SMTP `Message-ID` i povezati ga sa reply `In-Reply-To`/`References` zaglavljima kada su dostupna.
- [ ] Dodati metrike: zadnji uspješan schedule, zadnja IMAP poruka, broj odgovora, bounceova i grešaka.
- [ ] Dodati alarm ako očekivani 07:00 trigger nije pokrenut do 07:05.
- [ ] Dodati alarm ako IMAP listener nema heartbeat ili je veza zatvorena.

## Redoslijed implementacije

### Faza 1 — Sigurnost i backup

- [ ] Rotirati izložene pristupne podatke.
- [ ] Napraviti backup lokalnog, draft i published workflowa.
- [ ] Zabilježiti trenutno stanje egzekucija i verzija.
- [ ] Pripremiti rollback proceduru.

### Faza 2 — Provjera n8n Cloud scheduler stanja

- [ ] Objaviti minimalni testni schedule workflow.
- [ ] Potvrditi stvarnu automatsku egzekuciju.
- [ ] Po potrebi otvoriti support ticket i sačekati potvrdu popravke workspacea.

### Faza 3 — Popravka i razdvajanje workflowa

- [ ] Implementirati Outreach workflow.
- [ ] Implementirati IMAP Reply workflow.
- [ ] Implementirati vremenski Follow-up workflow.
- [ ] Izdvojiti tracking webhookove.
- [ ] Popraviti Appwrite queryje, paginaciju i idempotency.

### Faza 4 — Popravka aplikacijske integracije

- [ ] Ukloniti zastarjela imena trigger čvorova.
- [ ] Ukloniti oslanjanje na privatni n8n login/run API.
- [ ] Prikazivati draft/published razliku u administratorskom interfejsu.
- [ ] Prikazivati zadnju stvarnu automatsku egzekuciju i health status triggera.

### Faza 5 — Kontrolisano produkcijsko puštanje

- [ ] Testirati sa internim/test email adresama.
- [ ] Testirati jedan outbound email bez masovnog slanja.
- [ ] Poslati odgovor na testni email i potvrditi status `U pregovorima`.
- [ ] Testirati bounce poruku.
- [ ] Testirati open tracking webhook.
- [ ] Testirati WhatsApp follow-up bez dupliranja.
- [ ] Objaviti produkcijske workflowe.
- [ ] Nadzirati prvi stvarni ciklus u 07:00.
- [ ] Nakon uspješnog ciklusa arhivirati ili ukloniti stari monolitni workflow.

## Kriteriji da je sistem popravljen

- [x] Workflow se automatski pokrene u 07:00 po vremenu `Europe/Sarajevo` (potvrđeno 02.09.2026. egzekucijom 221).
- [ ] Egzekucija se u n8n-u vodi kao `mode=trigger`, sa očekivanim početnim čvorom.
- [ ] Novi odgovor klijenta ažurira lead na `U pregovorima` najkasnije nekoliko minuta nakon prijema.
- [ ] Odgovor primljen tokom prethodnog prekida može se pronaći kontrolisanim backfillom.
- [ ] Bounce ažurira lead/contact log samo jednom.
- [ ] Follow-up ne ide kontaktu koji je odgovorio, odbijen je ili je na blacklisti.
- [ ] Nema duplih emailova, WhatsApp poruka ni Slack obavijesti.
- [ ] Appwrite greška daje neuspješnu egzekuciju ili jasan alarm, a ne lažni `success`.
- [ ] Draft i published stanje su jasno vidljivi i očekivana verzija je stvarno aktivna.
- [ ] Produkcijski webhookovi su registrovani i provjereni.
- [ ] U Git-tracked fajlovima i historiji nema važećih pristupnih podataka.
- [ ] Postoji dokumentovan backup, rollback i postupak za ponovno registrovanje triggera.

## Pravila tokom popravke

- Ne slati masovne emailove tokom testiranja.
- Ne brisati contact logove, leadove ili historiju egzekucija bez posebne potvrde.
- Ne koristiti produkcijske ključeve u Git-tracked JSON-u ili skriptama.
- Svaku live izmjenu prvo potvrditi na testnom workflowu ili sa testnim kontaktom.
- Ne smatrati `active: true` ili oznaku `Published` dovoljnim dokazom da trigger radi.
- Nakon svake kritične izmjene zabilježiti workflow ID, version ID i test execution ID.
