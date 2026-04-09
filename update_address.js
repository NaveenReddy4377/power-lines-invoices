const fs = require('fs');

const rawData = `APITORIA PHARMA PRIVATE LIMITED UNIT -1	36AAQCA3500J1ZP	Sy.No:379,385,386 & 388 to 396 Borpatla Village,Hatnoora Mandal Sanga Reddy Dist.-502296,Telangana
APITORIA PHARMA PRIVATE LIMITED UNIT - 2	36AAQCA3500J1ZP	"Sy.No:10&13,Gaddapotharam Village IDA,Kazipally Industrial
Area,Jinnaram Mandal Sangareddy Dist,-502319,Telangana"
APITORIA PHARMA PRIVATE LIMITED UNIT - 3	36AAQCA3500J1ZP	Sy.No:374 Gundlamachanoor,Hatnoora Mandal Sanga Reddy Dist.-502296,Telangana
AUROBINDO PHARMA LTD UNIT - 2	36AABCA7366H1ZL	Plot No:103/A,SVCIE,IDA Bollaram,Jinnaram Mandal Sangareddy Dist.-502325,Telangana
AUROBINDO PHARMA LTD UNIT - 3	36AABCA7366H3ZJ	"Sy.No:313,314
Bachupally Village,Bachupally Medchalâ€“Malkajgiri District-
500090,Telangana"
AUROBINDO PHARMA LTD UNIT - 6	36AABCA7366H1ZL	Sy.No:329/39&329/47 Chitkul,Patancheru Mandal Medak Dist.-502307,Telangana
AUROBINDO PHARMA LTD UNIT - 7	36AABCA7366H2ZK	"Plot
No:S1(Part),Sy.No:411/P,425/P,434/P,43
5/P&458/P
SEZ-APIIC,Green Industrial
Park,Polepally Village,Jedcherla Mandal Mahaboobnagar Dist.-
509302,Telangana"
AUROBINDO PHARMA LTD UNIT - 12	36AABCA7366H1ZL	"Sy.No:314
Bachupally,Bachupally Mandal Medchal-Malkajgiri District-
500090,Telangana"
APL HEALTH CARE LTD UNIT - 1	36AAGCA4252P1ZC	"Sy.No. 410/P,411/P&458/P, Plot
No:S-1/B,
Pharma SEZ, IDA, APIIC,,Polapally
Village, Jadcherla Mandal  Mahaboobnagar Dist.-
509302,Telangana"
APL HEALTH CARE LTD UNIT- 3	36AAGCA4252P1ZC	"Sy.No. 410/P,411/P&458/P, Plot
No:S-1/B,
Pharma SEZ, IDA, TSIIC,,Polapally
Village, Jadcherla Mandal Mahaboobnagar Dist.-
509302,Telangana"
APL HEALTH CARE LTD UNIT- 4	37AAGCA4252P2Z9	"PLOT NO.16,APIIC LIMITED
MULTI PRODUCTS SEZ, PALCHUR AND
PART OF,113 PALEPALEM
VILLAGE,NAIDUPETA MANDAL SPSR NELLORE DIST-524421,Andhra
Pradesh"
EUGIA SEZ PRIVATE LIMITED	36AACCW8850H1ZZ	"Plot Nos. S-5/B, S-6 and S-7
Polepally Village
Pharmaceutical Formulations SEZ,TSIIC
Green Industrial Park,Jadcherla
Mahabubnagar Dist,-509302,Telangana"
EUGIA PHARMA SPECIALITIES LIMITED UNIT - 1	36AADCE3429K1ZK	"Survey Nos.550,551,552
Kolthur Village,Shameerpet Mandal
Rangareddy-500101,Telangana"
EUGIA PHARMA SPECIALITIES LIMITED UNIT - 3	36AADCE3429K2ZJ	"Plot Nos.4,34 to 48,
Phase-III
TSIIC,EPIP,I.D.A., Pashamylaram
Patancheru Mandal,
Medak District-502307,Telangana"
APL RESEARCH CENTER (A Divison of Aurobindo Pharma Ltd)	36AABCA7366H1ZL	"Divison of Aurobindo Pharma Ltd)
Sy.No.313&314, Bachupally
Village,Quthubullapur Mandal R R Dist.,-500090,Telangana"
AURO PEPTIDES LIMITED	36AAKCA1234F1Z1	"Survey No. 71 & 72, Indrakaran
Village,Sangareddy Mandal  Medak Dist.-502329,Telangana"
APL RESEARCH CENTER-2	36AABCA7366H1ZL	"Survey No.71 & 72, Indrakaran
Village,Sangareddy Mandal Medak Dist.-502329,Telangana"
SNJ SYNTHETICS LTD	36AAECS3176L1ZZ	149A, Sri Venkateshwara Co-Operative Industrial Estate, Narsapur Taluk Sanga Reddy District, Bollaram, Telangana 502325
GRANULES INDIA PRIVATE LTD	36AAACG7369K1Z6	Sy Nos.160/A,161/E,162&174/A,160/B&174/E Gagillapur(V),Dundigal-Gandimaisamma(M) Medchal-Malkhajgiri District-500043 Telangana,India
HETERO LABS LTD. UNIT-V	36AAACH5506R2Z7	"TSIIC FORMULATION SEZ (UNIT I) SURVEY NO: 439, 440, 441 & 458
POLEPALLY VILLAGE
JADCHERLA (MANDAL)
MAHABOOB NAGAR DISTRICT-509301"
PRAVESHA INDUSTRIES LTD(UNIT-2)	36AABCP4230D1ZX	 Anrich Industrial Estate, Bollaram Village, Jinnaram Mandal, Medak District, Hyderabad, Telangana, 502325.
VSP ISPAT PRIVATE LTD	36AACCV6826C1ZE	SURVEY NO 354 AND 362, V S P ISPAT PRIVATE LIMITED, HATNOOR MDL, CHANDAPUR, Sangareddy, Telangana, 502296
AP MET ENGG LTD	36AABCA8514D1Z1	Bollaram Industrial Area, Hyderabad, Telangana 502325
Lotus Chocolate Company Limited(Unit II)	36AAACL1891R1ZW	Survey No 161/A, S.V. CO-OP Industrial Area, IDA Bollaram, Sangareddy  District – 502325,Telangana
Lotus Chocolate Company Limited(Unit I)	36AAACL1891R1ZW	Sangareddy-Narsapur Rd, Doultabad @ Kothapet, Telangana 502296
SRI SHAKAUMBARI PACKING INDUSTRIES 	36ABRFS8014J1ZN	SY NO.172/C,PLOT NO.160/B, IDA BOLLARAM VILLAGE, IDA BOLLARAM VILLAGE, JINNARAM MANDAL, Sangareddy, Telangana, 502325
Perfect Electronics	36BBEPG7720H1ZS	3rd Floor, SHOPNO 441and 442, Padmavathi Plaza, Bhagyanagar Colony, Kukatapally, Medchal Malkajgiri, Telangana, 500072`;

function parseTSV(rawData) {
  let rows = [];
  let currentRow = [];
  let currentVal = "";
  let insideQuotes = false;
  
  for (let i = 0; i < rawData.length; i++) {
    let char = rawData[i];
    
    if (insideQuotes) {
      if (char === '"') {
        if (i + 1 < rawData.length && rawData[i+1] === '"') {
          currentVal += '"';
          i++; // skip next quote
        } else {
          insideQuotes = false;
        }
      } else {
        currentVal += char;
      }
    } else {
      if (char === '"') {
        insideQuotes = true;
      } else if (char === '\t') {
        currentRow.push(currentVal.trim());
        currentVal = "";
      } else if (char === '\n' || char === '\r') {
        currentRow.push(currentVal.trim());
        rows.push(currentRow);
        currentRow = [];
        currentVal = "";
        
        if (char === '\r' && i + 1 < rawData.length && rawData[i+1] === '\n') {
          i++;
        }
      } else {
        currentVal += char;
      }
    }
  }
  
  if (currentVal || currentRow.length > 0) {
    currentRow.push(currentVal.trim());
    rows.push(currentRow);
  }
  
  return rows.filter(r => r.length >= 2);
}

const parsed = parseTSV(rawData);

const companiesPath = 'src/data/companies.json';
let existing = [];
if (fs.existsSync(companiesPath)) {
  existing = JSON.parse(fs.readFileSync(companiesPath, 'utf8'));
}

let nameMap = new Map();
// Add all existing
for (let c of existing) {
  // normalize name for matching: uppercase, remove spaces/punctuation
  let norm = c.name.toUpperCase().replace(/[^a-zA-Z0-9]/g, '');
  nameMap.set(norm, c);
}

let added = 0;
let updated = 0;

for (let row of parsed) {
  let name = row[0].trim().toUpperCase();
  let gstin = row[1].trim();
  let address = row[2] ? row[2].trim().replace(/\s+/g, ' ') : undefined; // Remove newlines inside address and replace with space

  if (!name) continue;

  let norm = name.toUpperCase().replace(/[^a-zA-Z0-9]/g, '');
  
  if (nameMap.has(norm)) {
    // Update existing
    let target = nameMap.get(norm);
    target.name = name; // Update with the formatted name
    if (gstin) target.gstin = gstin;
    if (address) target.address = address;
    updated++;
  } else {
    // Insert new
    let newObj = { name, gstin };
    if (address) newObj.address = address;
    existing.push(newObj);
    nameMap.set(norm, newObj);
    added++;
  }
}

fs.writeFileSync(companiesPath, JSON.stringify(existing, null, 2));
console.log('Added:', added, 'Updated:', updated);
