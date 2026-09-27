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
  status?: 'Pending' | 'Cleared';
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
      name: '',
      hsn: '9987',
      quantity: 1,
      quantityUnit: 'NOS',
      price: 0,
      discount: 0,
      discountType: 'percentage'
    }
  ],
  taxes: {
    cgst: 0,
    sgst: 0
  },
  bankDetails: {
    name: 'POWER LINES ELECTRICAL WORKS',
    bank: 'STATE BANK OF INDIA - IDA BOLLARAM (CURRENT)',
    ifsc: 'SBIN0018062',
    accountNo: '43335667599',
    upiId: 'gadipallinaveenreddy-3@oksbi'
  },
  status: 'Pending'
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
  status?: 'Pending' | 'Cleared';
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
      hsn: '9987',
      quantity: 1,
      quantityUnit: 'NOS',
      price: 0,
      discount: 0,
      discountType: 'percentage'
    }
  ],
  taxes: { cgst: 0, sgst: 0 },
  termsAndConditions: [
    'This quotation is valid for 30 days from the date of issue.',
    'Payment terms: 50% advance, balance on delivery.',
    'Goods once sold will not be taken back.',
    'All disputes subject to Sangareddy jurisdiction.',
  ],
  status: 'Pending'
};


// ───────────────────────────── MOTOR QUOTATION TYPES ─────────────────────────────

export interface MotorRate {
  hp: string;
  rpm1440: number;
  rpm960: number;
}

export interface MotorQuotationData {
  quotationNo: string;
  quotationDate: string;
  percentageIncrease: number;
  companyName: string;
  companyAddress: string;
  termsAndConditions: string[];
  status?: 'Pending' | 'Cleared';
}

export const initialMotorQuotationData: MotorQuotationData = {
  quotationNo: 'PLEW-MQ-001',
  quotationDate: new Date().toISOString().split('T')[0],
  percentageIncrease: 0,
  companyName: '',
  companyAddress: '',
  termsAndConditions: [
    'GST @ 18% Extra.',
    'Transportation Extra at actuals.',
    'Payment: 100% against delivery.',
    'Delivery: Within 2-3 days from the date of work order.',
    'Warranty: 6 months against manufacturing defects.'
  ],
  status: 'Pending'
};

// ───────────────────────────── CRM & INVENTORY TYPES ─────────────────────────────

export interface Client {
  id: string;
  name: string;
  address: string;
  gstin: string;
  placeOfSupply: string;
  phone?: string;
}

export interface InventoryItem {
  id: string;
  name: string;
  description: string;
  hsn: string;
  quantityUnit: string;
  price: number;
}

// ───────────────────────────── DELIVERY CHALLAN TYPES ─────────────────────────────

export interface DeliveryChallanItem {
  id: string;
  materialCode?: string;
  description: string;
  uom?: string;
  quantity: number;
  weight?: string;
  remarks?: string;
}

export interface DeliveryChallanData {
  dcNo: string;
  dcDate: string;
  challanType: 'Returnable' | 'Non-Returnable' | 'Regular';
  customerName: string;
  customerAddress: string;
  customerGstin: string;
  rgpNo: string;
  rgpDate: string;
  poNo: string;
  poDate: string;
  vehicleNo: string;
  modeOfTransport: string;
  quotationRaised?: 'Yes' | 'No';
  items: DeliveryChallanItem[];
  remarks: string;
  rgpPhotoUrl?: string;
  status?: 'Pending' | 'Dispatched' | 'Delivered' | 'Cleared';
}

export const initialDeliveryChallanData: DeliveryChallanData = {
  dcNo: 'PLEW-DC-00001',
  dcDate: new Date().toISOString().split('T')[0],
  challanType: 'Returnable',
  customerName: '',
  customerAddress: '',
  customerGstin: '',
  rgpNo: '',
  rgpDate: '',
  poNo: '',
  poDate: '',
  vehicleNo: '',
  modeOfTransport: 'BY ROAD',
  quotationRaised: 'No',
  items: [
    {
      id: 'item-default-1',
      materialCode: '',
      description: '',
      uom: 'NOS',
      quantity: 1,
      weight: '',
      remarks: ''
    }
  ],
  remarks: '',
  status: 'Pending'
};

// ─── Cash Bill (Non-GST Normal Invoice) ───────────────────────────────────────
export interface CashBillItem {
  id: string;
  description: string;
  quantity: number;
  unit: string;
  rate: number;
  amount: number;
}

export interface CashBillData {
  billNo: string;
  billDate: string;
  paymentMode: 'Cash' | 'UPI' | 'Bank Transfer' | 'Cheque';
  paymentStatus: 'Paid' | 'Pending';
  customerName: string;
  customerPhone: string;
  customerAddress: string;
  vehicleNo?: string;
  items: CashBillItem[];
  discount: number;
  notes: string;
  status?: 'Paid' | 'Pending' | 'Cancelled';
}

export const initialCashBillData: CashBillData = {
  billNo: 'PLEW-CB-00001',
  billDate: new Date().toISOString().split('T')[0],
  paymentMode: 'Cash',
  paymentStatus: 'Paid',
  customerName: '',
  customerPhone: '',
  customerAddress: '',
  vehicleNo: '',
  items: [
    {
      id: 'cb-item-1',
      description: '',
      quantity: 1,
      unit: 'NOS',
      rate: 0,
      amount: 0
    }
  ],
  discount: 0,
  notes: '1. Goods once sold cannot be returned without bill.\n2. Warranty on motor rewinding & repairs as per standard terms.',
  status: 'Paid'
};


