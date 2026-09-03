import { resolvePureSocLocale, type PureSocLocale } from "@puresoc/shared";

export type ProductLocale = Extract<PureSocLocale, "en" | "ro">;

const romanianProductText: Record<string, string> = {
  "Action center": "Centru de acțiuni",
  "Add customer": "Adaugă client",
  "Add customer workspace": "Adaugă spațiul clientului",
  "Admin": "Administrare",
  "Analyzed gaps": "Deficiențe analizate",
  "Analyzer readiness": "Pregătirea analizei",
  "Approval action runs": "Acțiuni în curs de aprobare",
  "Approval gated": "Aprobare obligatorie",
  "Area": "Domeniu",
  "Attach evidence": "Atașează dovadă",
  "Back to dashboard": "Înapoi la tabloul de bord",
  "Baseline read": "Citire de bază",
  "Business baseline": "Context de afaceri",
  "Business profile": "Profilul companiei",
  "Channels": "Canale",
  "Choose country": "Alege țara",
  "Company": "Companie",
  "Company name": "Numele companiei",
  "Complete": "Complet",
  "Connect": "Conectează",
  "Connect Microsoft 365": "Conectează Microsoft 365",
  "Connected": "Conectat",
  "Connection": "Conexiune",
  "Connector mode": "Modul conectorului",
  "Connectors": "Conectori",
  "Control": "Control",
  "Country": "Țară",
  "Country pack": "Pachet național",
  "Create gap PDF": "Generează PDF-ul deficiențelor",
  "Create posture PDF": "Generează PDF-ul Microsoft 365",
  "Create readiness PDF": "Generează PDF-ul de pregătire",
  "Created": "Creat",
  "Critical gaps": "Deficiențe critice",
  "Current customer": "Client activ",
  "Customer name": "Numele clientului",
  "Customers": "Clienți",
  "Dashboard": "Tablou de bord",
  "Data sources": "Surse de date",
  "Download PDF": "Descarcă PDF",
  "Draft": "Ciornă",
  "Evidence": "Dovezi",
  "Evidence library": "Bibliotecă de dovezi",
  "Evidence note": "Notă pentru dovadă",
  "Evidence title": "Titlul dovezii",
  "Execution": "Execuție",
  "Execution boundary": "Limită de execuție",
  "Finding": "Constatare",
  "Gap": "Deficiență",
  "Gap Analyzer": "Analiză de deficiențe",
  "Gap list": "Lista deficiențelor",
  "Gap or recommendation": "Deficiență sau recomandare",
  "Gap report": "Raport de deficiențe",
  "Generated reports": "Rapoarte generate",
  "Governance": "Guvernanță",
  "Guided": "Ghidat",
  "Intune read": "Citire Intune",
  "Invite teammates": "Invită colegi",
  "Invite users": "Invită utilizatori",
  "Last sync": "Ultima sincronizare",
  "Legal name": "Denumirea legală",
  "Manage connection": "Administrează conexiunea",
  "Manual and connector baseline": "Bază manuală și date din conector",
  "Manual baseline only": "Doar bază manuală",
  "Microsoft 365 connected": "Microsoft 365 conectat",
  "Microsoft 365 connector": "Conector Microsoft 365",
  "Microsoft 365 findings": "Constatări Microsoft 365",
  "Microsoft 365 not connected": "Microsoft 365 neconectat",
  "Microsoft 365 posture": "Postura Microsoft 365",
  "Module": "Modul",
  "Module coverage": "Acoperirea modulelor",
  "Next action": "Acțiunea următoare",
  "No activity yet": "Nicio activitate încă",
  "No module data": "Nu există date despre module",
  "No reports yet": "Nu există rapoarte încă",
  "Not connected": "Neconectat",
  "Not mapped": "Nemapat",
  "Notification channels": "Canale de notificare",
  "Notifications": "Notificări",
  "Onboarding": "Configurare inițială",
  "Open": "Deschide",
  "Open connector settings": "Deschide setările conectorului",
  "Open customer workspace": "Deschide spațiul clientului",
  "Operations": "Operațiuni",
  "Owner and admin managed": "Administrat de proprietar și administrator",
  "Partner portfolio": "Portofoliu partener",
  "Permissions": "Permisiuni",
  "Planned data source.": "Sursă de date planificată.",
  "Priority": "Prioritate",
  "Primary navigation": "Navigare principală",
  "Progress": "Progres",
  "Providers": "Furnizori",
  "Readiness": "Pregătire",
  "Readiness areas": "Domenii de pregătire",
  "Readiness input": "Date pentru evaluare",
  "Readiness score": "Scor de pregătire",
  "Recommended next action": "Acțiunea recomandată",
  "Recommended next step": "Pasul următor recomandat",
  "Recommendations": "Recomandări",
  "Reconnect": "Reconectează",
  "Remediation": "Remediere",
  "Report": "Raport",
  "Reports": "Rapoarte",
  "Reports and exports": "Rapoarte și exporturi",
  "Review": "Revizuiește",
  "Risk": "Risc",
  "Run analyzer": "Rulează analiza",
  "Save screen": "Salvează etapa",
  "Scan": "Scanare",
  "Security posture": "Postură de securitate",
  "Security read": "Citire securitate",
  "Settings": "Setări",
  "Severity": "Severitate",
  "Sign out": "Deconectare",
  "Signal": "Semnal",
  "Source": "Sursă",
  "Status": "Stare",
  "Switch workspace": "Schimbă spațiul de lucru",
  "Tenant": "Organizație Microsoft",
  "Tenant ID": "ID organizație Microsoft",
  "Tenant intelligence": "Informații despre organizația Microsoft",
  "Users and roles": "Utilizatori și roluri",
  "Verified signals available": "Semnale verificate disponibile",
  "Workspace": "Spațiu de lucru",
  "Workspace overview": "Imagine de ansamblu",
  "Workspace settings": "Setările spațiului de lucru",
  "Write gated": "Scriere blocată",
  "Write actions require approval": "Acțiunile de scriere necesită aprobare"
};

const romanianStatuses: Record<string, string> = {
  active: "activ",
  admin: "administrator",
  analyst: "analist",
  approved: "aprobat",
  attention: "necesită atenție",
  blocked: "blocat",
  coming_later: "disponibil ulterior",
  complete: "complet",
  completed: "finalizat",
  connected: "conectat",
  critical: "critic",
  demo: "demonstrativ",
  disconnected: "neconectat",
  draft: "ciornă",
  failed: "eșuat",
  high: "ridicat",
  in_progress: "în desfășurare",
  informational: "informativ",
  low: "scăzut",
  medium: "mediu",
  needs_evidence: "necesită dovezi",
  not_connected: "neconectat",
  not_started: "neînceput",
  open: "deschis",
  owner: "proprietar",
  partial: "parțial",
  passing: "conform",
  pending: "în așteptare",
  planned: "planificat",
  ready: "pregătit",
  review: "de revizuit",
  review_required: "necesită revizuire",
  stored: "stocat",
  succeeded: "reușit",
  viewer: "vizualizator",
  warning: "atenție"
};

const romanianDemoDataText: Record<string, string> = {
  "pharmaceutical manufacturer": "producător farmaceutic",
  "food distributor": "distribuitor alimentar",
  "managed service provider": "furnizor de servicii administrate",
  "likely in scope": "probabil în domeniul NIS2",
  "possibly in scope": "posibil în domeniul NIS2",
  "legal review required": "necesită analiză juridică",
  partner_service_regulated_process_review: "revizuirea proceselor reglementate",
  partner_service_privileged_access_review: "revizuirea accesului privilegiat",
  microsoft_security_capability_evaluation: "evaluarea capabilităților de securitate Microsoft",
  "Declared assessment and NIS2 readiness gaps": "Evaluarea declarată și deficiențele de pregătire NIS2",
  "Partial assessment and disconnected Microsoft state": "Evaluare parțială și Microsoft 365 neconectat",
  "Microsoft 365 subscription context and NIS2 readiness gaps":
    "Abonamentele Microsoft 365 și deficiențele de pregătire NIS2",
  "Review regulated process access, supplier risk, and continuity evidence":
    "Revizuiți accesul la procesele reglementate, riscul furnizorilor și dovezile de continuitate",
  "Schedule privileged access and incident handling workshop":
    "Programați un atelier pentru acces privilegiat și gestionarea incidentelor",
  "Review privileged access exposure and request partner proposal":
    "Revizuiți expunerea accesului privilegiat și solicitați propunerea partenerului",
  "Review regulated process access and endpoint protection coverage":
    "Revizuiți accesul la procesele reglementate și acoperirea protecției endpoint",
  "Add supplier continuity and endpoint coverage review to the readiness plan":
    "Adăugați în plan revizuirea continuității furnizorilor și a protecției endpoint",
  "Compare Microsoft security options": "Comparați opțiunile de securitate Microsoft",
  "Evaluate Microsoft 365 Business Premium for security capability coverage":
    "Evaluați Microsoft 365 Business Premium pentru acoperirea capabilităților de securitate"
};

const romanianScreenCopy: Record<string, { title: string; summary: string }> = {
  company: {
    title: "Identitatea companiei",
    summary: "Identitatea legală și datele de înregistrare pentru evaluare."
  },
  locations: {
    title: "Locații și jurisdicție",
    summary: "Sediul, țările în care activați și pachetul național NIS2."
  },
  contacts: {
    title: "Contacte și responsabilități",
    summary: "Responsabilii operaționali, de securitate și de management."
  },
  size: {
    title: "Dimensiune și structură legală",
    summary: "Numărul de angajați, categoria de mărime și structura organizației."
  },
  services: {
    title: "Sectoare și servicii",
    summary: "Serviciile și sectoarele care determină încadrarea NIS2."
  },
  "country-scope": {
    title: "Încadrare specifică României",
    summary: "Întrebări naționale din pachetul legislativ selectat."
  },
  systems: {
    title: "Sisteme și adrese IP publice",
    summary: "Sisteme critice, intervale IP publice și dependențe operaționale."
  },
  providers: {
    title: "Furnizori și conectori",
    summary: "Furnizori conectați și dependențe importante de terți."
  },
  "security-baseline": {
    title: "Baza de securitate",
    summary: "Declarații despre guvernanță, identitate, continuitate și furnizori."
  },
  evidence: {
    title: "Dovezi și documente",
    summary: "Dovezile folosite în rapoartele interne de pregătire."
  },
  review: {
    title: "Revizuire și analiză",
    summary: "Verificați datele lipsă, confirmați avertismentul și rulați analiza."
  }
};

const romanianFieldLabels: Record<string, string> = {
  "company.legalName": "Denumirea legală a companiei",
  "company.registrationNumber": "Număr de înregistrare la Registrul Comerțului",
  "company.taxId": "Cod unic de înregistrare (CUI)",
  "company.countryCode": "Pachet național",
  "locations.headquartersCountry": "Țara sediului principal",
  "locations.headquartersCity": "Localitatea sediului principal",
  "business.countriesServed": "Țări în care sunt furnizate servicii",
  "contacts.primaryName": "Persoană principală de contact",
  "contacts.primaryEmail": "Email principal",
  "contacts.securityName": "Responsabil de securitate",
  "contacts.securityEmail": "Email pentru securitate",
  "contacts.managementOwnerName": "Responsabil din conducere",
  "business.employeeCount": "Număr de angajați",
  "size.sizeCategory": "Categoria de mărime",
  "size.legalStructure": "Structura juridică",
  "business.sector": "Sector principal",
  "business.mainProductsServices": "Produse sau servicii principale",
  "scope.activities": "Servicii relevante",
  "scope.publicAdministration": "Administrație publică sau organism public",
  "scope.telecomProvider": "Furnizor de telecomunicații",
  "systems.systemsDescription": "Sisteme critice",
  "systems.publicIpRanges": "Intervale IP publice",
  "providers.microsoft365Usage": "Utilizarea Microsoft 365",
  "dependencies.criticalSuppliers": "Furnizori critici",
  "governance.riskManagement": "Managementul riscurilor",
  "governance.identityControls": "Controale de identitate și acces",
  "governance.mfa": "Acoperirea autentificării MFA",
  "governance.supplyChainSecurity": "Securitatea lanțului de aprovizionare",
  "dependencies.backupArrangements": "Măsuri de backup",
  "dependencies.businessContinuity": "Continuitatea activității",
  "dependencies.incidentResponse": "Răspunsul la incidente",
  "evidence.declaredControlEvidence": "Note privind dovezile",
  attachedDocumentIds: "Referințe la documente",
  "review.legalCaveatAcknowledged": "Avertismentul privind evaluarea internă a fost confirmat",
  selectedServiceTypeCodes: "Servicii relevante conform cadrului NIS2 din România",
  "relationship.establishedInRomania": "Entitatea este stabilită în România",
  "relationship.mainOfficeInRomania": "Sediul principal este în România",
  "relationship.providesServicesInRomania": "Furnizează servicii în România",
  "relationship.providesServicesInAnotherEuMemberState": "Furnizează servicii într-un alt stat membru UE",
  "relationship.publicAdministrationEstablishedByRomania": "Organism de administrație publică înființat de România",
  "relationship.criticalEntityInRomaniaLaw294": "Entitate critică potrivit Legii nr. 294/2024",
  "article9.soleProviderEssentialService": "Furnizor unic al unui serviciu esențial",
  "article9.publicSafetySecurityOrHealthImpact": "Impact potențial asupra siguranței, securității sau sănătății publice",
  "article9.systemicRisk": "Risc sistemic sau transfrontalier potențial",
  "article9.nationalOrRegionalCriticality": "Criticitate națională sau regională"
};

const romanianOptionLabels: Record<string, string> = {
  implemented: "Implementat",
  partial: "Implementat parțial",
  planned: "Planificat",
  not_started: "Neînceput",
  small_micro: "Întreprindere mică sau microîntreprindere",
  medium: "Întreprindere mijlocie",
  large: "Întreprindere mare",
  standalone: "Companie independentă",
  group_parent: "Companie-mamă",
  subsidiary: "Filială",
  public_body: "Organism public",
  other: "Altă structură",
  other_eu: "Altă țară din UE",
  non_eu: "În afara UE",
  not_connected: "Neconectat încă",
  email_collaboration: "Email și colaborare",
  identity_devices_security: "Identitate, dispozitive și securitate",
  not_used: "Nu este utilizat",
  true: "Da",
  false: "Nu",
  low: "Scăzut",
  high: "Ridicat"
};

export const resolveProductLocale = (locale?: string | null): ProductLocale =>
  resolvePureSocLocale(locale).locale === "ro" ? "ro" : "en";

export const productText = (locale: string | null | undefined, english: string): string =>
  resolveProductLocale(locale) === "ro" ? (romanianProductText[english] ?? english) : english;

export const productStatusText = (locale: string | null | undefined, status: string): string => {
  const normalized = status.trim().toLowerCase().replaceAll(" ", "_");
  if (resolveProductLocale(locale) === "ro") {
    return romanianStatuses[normalized] ?? status.replaceAll("_", " ");
  }
  return status.replaceAll("_", " ");
};

export const productDataText = (locale: string | null | undefined, value: string): string =>
  resolveProductLocale(locale) === "ro" ? (romanianDemoDataText[value] ?? value) : value;

export const productCountryName = (locale: string | null | undefined, countryCode: string): string => {
  if (resolveProductLocale(locale) !== "ro") {
    return countryCode === "RO" ? "Romania" : countryCode === "PL" ? "Poland" : countryCode === "DE" ? "Germany" : countryCode;
  }
  return countryCode === "RO" ? "România" : countryCode === "PL" ? "Polonia" : countryCode === "DE" ? "Germania" : countryCode;
};

export const productOnboardingScreenCopy = (
  locale: string | null | undefined,
  screen: { key: string; title: string; summary: string }
): { title: string; summary: string } =>
  resolveProductLocale(locale) === "ro" ? (romanianScreenCopy[screen.key] ?? screen) : screen;

export const productOnboardingFieldLabel = (
  locale: string | null | undefined,
  fieldKey: string,
  fallbackLabel: string
): string => resolveProductLocale(locale) === "ro" ? (romanianFieldLabels[fieldKey] ?? fallbackLabel) : fallbackLabel;

export const productOnboardingOptionLabel = (
  locale: string | null | undefined,
  value: string,
  fallbackLabel: string
): string => resolveProductLocale(locale) === "ro" ? (romanianOptionLabels[value] ?? fallbackLabel) : fallbackLabel;

export const productNextActionLabel = (locale: string | null | undefined, label: string): string => {
  if (resolveProductLocale(locale) !== "ro") {
    return label;
  }
  if (label.includes("onboarding")) return "Începe configurarea evaluării";
  if (label.includes("gap")) return "Rulează analiza de deficiențe";
  if (label.includes("Microsoft")) return "Conectează Microsoft 365";
  return "Revizuiește planul de remediere";
};

export const localeLabel = (locale: string | null | undefined): string =>
  resolveProductLocale(locale) === "ro" ? "Română" : "English";
