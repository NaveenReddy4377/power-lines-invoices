export interface InvoiceItem {
  id: string;
  name: string;
  hsn: string;
  quantity: number;
  quantityUnit: string;
  price: number;
  discount: number;
  discountType: 'percentage' | 'flat';
}

export interface InvoiceData {
  invoiceNo: string;
  invoiceDate: string;
  dueDate: string;
  poNumber: string;
  poDate: string;
  
  billTo: {
    name: string;
    address: string;
    gstin: string;
    placeOfSupply: string;
    panNumber: string;
  };
  
  shipTo: {
    name: string;
    address: string;
  };
  
  items: InvoiceItem[];
  
  taxes: {
    cgst: number;
    sgst: number;
  };
  
  bankDetails: {
    name: string;
    bank: string;
    ifsc: string;
    accountNo: string;
    upiId: string;
  };
}

export const initialInvoiceData: InvoiceData = {
  invoiceNo: 'PLEW001231',
  invoiceDate: new Date().toISOString().split('T')[0],
  dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
  poNumber: '',
  poDate: '',
  billTo: {
    name: '',
    address: '',
    gstin: '',
    placeOfSupply: 'Telangana',
    panNumber: ''
  },
  shipTo: {
    name: '',
    address: ''
  },
  items: [
    {
      id: crypto.randomUUID(),
      name: '1.5HP/23STAGE V3 MOTOR',
      hsn: '',
      quantity: 2,
      quantityUnit: 'NOS',
      price: 12550,
      discount: 0,
      discountType: 'percentage'
    }
  ],
  taxes: {
    cgst: 9,
    sgst: 9
  },
  bankDetails: {
    name: 'POWER LINES ELECTRICAL WORKS',
    bank: 'STATE BANK OF INDIA - IDA BOLLARAM (CURRENT)',
    ifsc: 'SBIN0018062',
    accountNo: '43335667599',
    upiId: 'gadipallinaveenreddy-3@oksbi'
  }
};

// ───────────────────────────── QUOTATION TYPES ─────────────────────────────

export interface QuotationData {
  quotationNo: string;
  quotationDate: string;
  validUntil: string;
  subject: string;
  rgpNumber: string;
  rgpDate: string;

  billTo: {
    name: string;
    address: string;
    gstin: string;
    placeOfSupply: string;
  };

  items: InvoiceItem[];

  taxes: {
    cgst: number;
    sgst: number;
  };

  termsAndConditions: string[];
}

export const initialQuotationData: QuotationData = {
  quotationNo: 'PLEW-Q-001',
  quotationDate: new Date().toISOString().split('T')[0],
  validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
  subject: '',
  rgpNumber: '',
  rgpDate: '',
  billTo: {
    name: '',
    address: '',
    gstin: '',
    placeOfSupply: 'Telangana',
  },
  items: [
    {
      id: crypto.randomUUID(),
      name: '',
      hsn: '',
      quantity: 1,
      quantityUnit: 'NOS',
      price: 0,
      discount: 0,
      discountType: 'percentage'
    }
  ],
  taxes: { cgst: 9, sgst: 9 },
  termsAndConditions: [
    'This quotation is valid for 30 days from the date of issue.',
    'Payment terms: 50% advance, balance on delivery.',
    'Goods once sold will not be taken back.',
    'All disputes subject to Sangareddy jurisdiction.',
  ]
};

