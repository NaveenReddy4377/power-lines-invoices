import { saveClient } from '../src/app/actions';
import * as crypto from 'crypto';

const clients = [
  {
    "name": "APITORIA PHARMA PRIVATE LIMITED UNIT -1",
    "gstin": "36AAQCA3500J1ZP",
    "address": "Sy.No:379,385,386 & 388 to 396 Borpatla Village,Hatnoora Mandal Sanga Reddy Dist.-502296,Telangana"
  },
  {
    "name": "APITORIA PHARMA PRIVATE LIMITED UNIT - 2",
    "gstin": "36AAQCA3500J1ZP",
    "address": "Sy.No:10&13,Gaddapotharam Village IDA,Kazipally Industrial Area,Jinnaram Mandal Sangareddy Dist,-502319,Telangana"
  },
  {
    "name": "APITORIA PHARMA PRIVATE LIMITED UNIT - 3",
    "gstin": "36AAQCA3500J1ZP",
    "address": "Sy.No:374 Gundlamachanoor,Hatnoora Mandal Sanga Reddy Dist.-502296,Telangana"
  },
  {
    "name": "AUROBINDO PHARMA LTD UNIT - 2",
    "gstin": "36AABCA7366H1ZL",
    "address": "Plot No:103/A,SVCIE,IDA Bollaram,Jinnaram Mandal Sangareddy Dist.-502325,Telangana"
  },
  {
    "name": "AUROBINDO PHARMA LTD UNIT - 3",
    "gstin": "36AABCA7366H3ZJ",
    "address": "Sy.No:313,314 Bachupally Village,Bachupally Medchal–Malkajgiri District-500090,Telangana"
  },
  {
    "name": "AUROBINDO PHARMA LTD UNIT - 6",
    "gstin": "36AABCA7366H1ZL",
    "address": "Sy.No:329/39&329/47 Chitkul,Patancheru Mandal Medak Dist.-502307,Telangana"
  },
  {
    "name": "AUROBINDO PHARMA LTD UNIT - 7",
    "gstin": "36AABCA7366H2ZK",
    "address": "Plot No:S1(Part),Sy.No:411/P,425/P,434/P,435/P&458/P SEZ-APIIC,Green Industrial Park,Polepally Village,Jedcherla Mandal Mahaboobnagar Dist.-509302,Telangana"
  },
  {
    "name": "AUROBINDO PHARMA LTD UNIT - 12",
    "gstin": "36AABCA7366H1ZL",
    "address": "Sy.No:314 Bachupally,Bachupally Mandal Medchal-Malkajgiri District-500090,Telangana"
  },
  {
    "name": "APL HEALTH CARE LTD UNIT - 1",
    "gstin": "36AAGCA4252P1ZC",
    "address": "Sy.No. 410/P,411/P&458/P, Plot No:S-1/B, Pharma SEZ, IDA, APIIC,,Polapally Village, Jadcherla Mandal Mahaboobnagar Dist.-509302,Telangana"
  },
  {
    "name": "APL HEALTH CARE LTD UNIT- 3",
    "gstin": "36AAGCA4252P1ZC",
    "address": "Sy.No. 410/P,411/P&458/P, Plot No:S-1/B, Pharma SEZ, IDA, TSIIC,,Polapally Village, Jadcherla Mandal Mahaboobnagar Dist.-509302,Telangana"
  },
  {
    "name": "APL HEALTH CARE LTD UNIT- 4",
    "gstin": "37AAGCA4252P2Z9",
    "address": "PLOT NO.16,APIIC LIMITED MULTI PRODUCTS SEZ, PALCHUR AND PART OF,113 PALEPALEM VILLAGE,NAIDUPETA MANDAL SPSR NELLORE DIST-524421,Andhra Pradesh"
  },
  {
    "name": "EUGIA SEZ PRIVATE LIMITED",
    "gstin": "36AACCW8850H1ZZ",
    "address": "Plot Nos. S-5/B, S-6 and S-7 Polepally Village Pharmaceutical Formulations SEZ,TSIIC Green Industrial Park,Jadcherla Mahabubnagar Dist,-509302,Telangana"
  },
  {
    "name": "EUGIA PHARMA SPECIALITIES LIMITED UNIT - 1",
    "gstin": "36AADCE3429K1ZK",
    "address": "Survey Nos.550,551,552 Kolthur Village,Shameerpet Mandal Rangareddy-500101,Telangana"
  },
  {
    "name": "EUGIA PHARMA SPECIALITIES LIMITED UNIT - 3",
    "gstin": "36AADCE3429K2ZJ",
    "address": "Plot Nos.4,34 to 48, Phase-III TSIIC,EPIP,I.D.A., Pashamylaram Patancheru Mandal, Medak District-502307,Telangana"
  },
  {
    "name": "APL RESEARCH CENTER (A Divison of Aurobindo Pharma Ltd)",
    "gstin": "36AABCA7366H1ZL",
    "address": "Sy.No.313&314, Bachupally Village,Quthubullapur Mandal R R Dist.,-500090,Telangana"
  },
  {
    "name": "AURO PEPTIDES LIMITED",
    "gstin": "36AAKCA1234F1Z1",
    "address": "Survey No. 71 & 72, Indrakaran Village,Sangareddy Mandal Medak Dist.-502329,Telangana"
  },
  {
    "name": "APL RESEARCH CENTER-2",
    "gstin": "36AABCA7366H1ZL",
    "address": "Survey No.71 & 72, Indrakaran Village,Sangareddy Mandal Medak Dist.-502329,Telangana"
  },
  {
    "name": "SNJ SYNTHETICS LTD",
    "gstin": "36AAECS3176L1ZZ",
    "address": "149A, Sri Venkateshwara Co-Operative Industrial Estate, Narsapur Taluk Sanga Reddy District, Bollaram, Telangana 502325"
  },
  {
    "name": "GRANULES INDIA PRIVATE LTD",
    "gstin": "36AAACG7369K1Z6",
    "address": "Sy Nos.160/A,161/E,162&174/A,160/B&174/E Gagillapur(V),Dundigal-Gandimaisamma(M) Medchal-Malkhajgiri District-500043 Telangana,India"
  },
  {
    "name": "HETERO LABS LTD. UNIT-V",
    "gstin": "36AAACH5506R2Z7",
    "address": "TSIIC FORMULATION SEZ (UNIT I) SURVEY NO: 439, 440, 441 & 458 POLEPALLY VILLAGE JADCHERLA (MANDAL) MAHABOOB NAGAR DISTRICT-509301"
  },
  {
    "name": "PRAVESHA INDUSTRIES LTD(UNIT-2)",
    "gstin": "36AABCP4230D1ZX",
    "address": "Anrich Industrial Estate, Bollaram Village, Jinnaram Mandal, Medak District, Hyderabad, Telangana, 502325"
  },
  {
    "name": "VSP ISPAT PRIVATE LTD",
    "gstin": "36AACCV6826C1ZE",
    "address": "SURVEY NO 354 AND 362, V S P ISPAT PRIVATE LIMITED, HATNOOR MDL, CHANDAPUR, Sangareddy, Telangana, 502296"
  },
  {
    "name": "AP MET ENGG LTD",
    "gstin": "36AABCA8514D1Z1",
    "address": "Bollaram Industrial Area, Hyderabad, Telangana 502325"
  },
  {
    "name": "Lotus Chocolate Company Limited(Unit II)",
    "gstin": "36AAACL1891R1ZW",
    "address": "Survey No 161/A, S.V. CO-OP Industrial Area, IDA Bollaram, Sangareddy District – 502325,Telangana"
  },
  {
    "name": "Lotus Chocolate Company Limited(Unit I)",
    "gstin": "36AAACL1891R1ZW",
    "address": "Sangareddy-Narsapur Rd, Doultabad @ Kothapet, Telangana 502296"
  },
  {
    "name": "SRI SHAKAUMBARI PACKING INDUSTRIES",
    "gstin": "36ABRFS8014J1ZN",
    "address": "SY NO.172/C,PLOT NO.160/B, IDA BOLLARAM VILLAGE, IDA BOLLARAM VILLAGE, JINNARAM MANDAL, Sangareddy, Telangana, 502325"
  },
  {
    "name": "Perfect Electronics",
    "gstin": "36BBEPG7720H1ZS",
    "address": "3rd Floor, SHOPNO 441and 442, Padmavathi Plaza, Bhagyanagar Colony, Kukatapally, Medchal Malkajgiri, Telangana, 500072"
  }
];

async function seed() {
  console.log(`Seeding ${clients.length} clients...`);
  for (const client of clients) {
    const formatted = {
      id: crypto.randomUUID(),
      name: client.name,
      gstin: client.gstin,
      address: client.address,
      placeOfSupply: "Telangana" // Default assumption mapping
    };
    
    // Check if the address implies a different place of supply
    if (client.address.includes("Andhra Pradesh")) {
      formatted.placeOfSupply = "Andhra Pradesh";
    }
    
    try {
      await saveClient(formatted);
      console.log(`Successfully inserted: ${client.name}`);
    } catch (e: any) {
      console.error(`Failed to insert ${client.name}:`, e.message);
    }
  }
  console.log("Seeding complete!");
}

seed();
