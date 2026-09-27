import { NextRequest, NextResponse } from 'next/server';
import nodemailer from 'nodemailer';

// ─── Types ──────────────────────────────────────────────────────────────────
interface InvoiceItem {
  name: string;
  hsn?: string;
  quantity: number;
  quantityUnit?: string;
  price: number;
  discount: number;
  discountType: 'percentage' | 'flat';
}

interface EmailPayload {
  to: string;
  subject: string;
  message: string;
  type: 'invoice' | 'quotation';
  documentData: Record<string, any>;
  pdfBase64?: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
function fmt(n: number) {
  return n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function calcTotals(items: InvoiceItem[], taxes: { cgst: number; sgst: number }) {
  const subtotal = items.reduce((sum, item) => {
    let tot = item.price * item.quantity;
    if (item.discount > 0) {
      tot -= item.discountType === 'percentage' ? tot * (item.discount / 100) : item.discount;
    }
    return sum + tot;
  }, 0);
  const cgst = subtotal * (taxes.cgst / 100);
  const sgst = subtotal * (taxes.sgst / 100);
  return { subtotal, cgst, sgst, grandTotal: subtotal + cgst + sgst };
}

// ─── HTML Email Templates ────────────────────────────────────────────────────
function buildInvoiceHTML(data: Record<string, any>, message: string): string {
  const items: InvoiceItem[] = data.items || [];
  const taxes = data.taxes || { cgst: 9, sgst: 9 };
  const { subtotal, cgst, sgst, grandTotal } = calcTotals(items, taxes);

  const itemRows = items.map((item, i) => {
    let tot = item.price * item.quantity;
    if (item.discount > 0) {
      tot -= item.discountType === 'percentage' ? tot * (item.discount / 100) : item.discount;
    }
    return `
      <tr style="border-bottom:1px solid #e2e8f0; ${i % 2 === 0 ? 'background:#f8fafc;' : ''}">
        <td style="padding:10px 12px;">${i + 1}</td>
        <td style="padding:10px 12px; font-weight:600;">${item.name}</td>
        <td style="padding:10px 12px; color:#64748b;">${item.hsn || '-'}</td>
        <td style="padding:10px 12px; text-align:center;">${item.quantity} ${item.quantityUnit || ''}</td>
        <td style="padding:10px 12px; text-align:right;">₹ ${fmt(item.price)}</td>
        <td style="padding:10px 12px; text-align:right; font-weight:700;">₹ ${fmt(tot)}</td>
      </tr>`;
  }).join('');

  const customMsg = message.trim()
    ? `<div style="background:#f0fdf4; border-left:4px solid #10b981; padding:16px 20px; margin-bottom:24px; border-radius:6px; color:#065f46; font-size:14px; line-height:1.6;">${message.replace(/\n/g, '<br>')}</div>`
    : '';

  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"><title>Tax Invoice ${data.invoiceNo}</title></head>
<body style="margin:0;padding:0;font-family:'Segoe UI',Arial,sans-serif;background:#f1f5f9;color:#1e293b;">
  <div style="max-width:700px;margin:40px auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.10);">
    
    <!-- Header Banner -->
    <div style="background:linear-gradient(135deg,#0f172a 0%,#1e3a5f 100%);padding:32px 40px;color:#fff;">
      <table width="100%" cellpadding="0" cellspacing="0">
        <tr>
          <td>
            <div style="font-size:22px;font-weight:800;letter-spacing:-0.5px;">POWER LINES ELECTRICAL WORKS</div>
            <div style="font-size:12px;color:#94a3b8;margin-top:4px;">FLAT NO.13-178, NEAR BALAJI HOTEL, SANGAREDDY, TELANGANA-502325</div>
            <div style="font-size:12px;color:#94a3b8;margin-top:2px;">GSTIN: 36PBJPK1510A1ZZ &nbsp;|&nbsp; Mobile: 9676774370</div>
          </td>
          <td align="right" valign="top">
            <div style="background:rgba(255,255,255,0.12);border-radius:8px;padding:12px 20px;display:inline-block;text-align:center;">
              <div style="font-size:11px;color:#94a3b8;text-transform:uppercase;letter-spacing:1px;">TAX INVOICE</div>
              <div style="font-size:20px;font-weight:800;color:#34d399;margin-top:2px;">${data.invoiceNo}</div>
            </div>
          </td>
        </tr>
      </table>
    </div>

    <!-- Meta Row -->
    <div style="background:#f8fafc;border-bottom:1px solid #e2e8f0;padding:16px 40px;">
      <table width="100%" cellpadding="0" cellspacing="0">
        <tr>
          <td style="font-size:12px;color:#64748b;">Invoice Date: <strong style="color:#1e293b;">${(data.invoiceDate || '').split('-').reverse().join('/')}</strong></td>
          <td style="font-size:12px;color:#64748b;text-align:center;">Due Date: <strong style="color:#1e293b;">${(data.dueDate || '').split('-').reverse().join('/') || '-'}</strong></td>
          <td style="font-size:12px;color:#64748b;text-align:right;">PO No: <strong style="color:#1e293b;">${data.poNumber || '-'}</strong></td>
        </tr>
      </table>
    </div>

    <!-- Content Area -->
    <div style="padding:32px 40px;">
      ${customMsg}

      <!-- Bill To -->
      <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:16px 20px;margin-bottom:24px;">
        <div style="font-size:11px;text-transform:uppercase;color:#64748b;letter-spacing:1px;margin-bottom:8px;">BILL TO</div>
        <div style="font-size:16px;font-weight:700;">${data.billTo?.name || '-'}</div>
        ${data.billTo?.address ? `<div style="font-size:13px;color:#64748b;margin-top:4px;">${data.billTo.address}</div>` : ''}
        ${data.billTo?.gstin ? `<div style="font-size:12px;color:#64748b;margin-top:4px;">GSTIN: ${data.billTo.gstin}</div>` : ''}
      </div>

      <!-- Items Table -->
      <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e2e8f0;border-radius:8px;overflow:hidden;margin-bottom:20px;font-size:13px;">
        <thead>
          <tr style="background:#0f172a;color:#fff;">
            <th style="padding:12px;text-align:left;font-weight:600;width:30px;">#</th>
            <th style="padding:12px;text-align:left;font-weight:600;">Item Description</th>
            <th style="padding:12px;text-align:left;font-weight:600;">HSN</th>
            <th style="padding:12px;text-align:center;font-weight:600;">Qty</th>
            <th style="padding:12px;text-align:right;font-weight:600;">Rate</th>
            <th style="padding:12px;text-align:right;font-weight:600;">Amount</th>
          </tr>
        </thead>
        <tbody>${itemRows}</tbody>
        <tfoot>
          <tr style="border-top:1px solid #e2e8f0;background:#f8fafc;">
            <td colspan="5" style="padding:10px 12px;text-align:right;font-size:12px;color:#64748b;">Subtotal</td>
            <td style="padding:10px 12px;text-align:right;font-weight:600;">₹ ${fmt(subtotal)}</td>
          </tr>
          <tr style="background:#f8fafc;">
            <td colspan="5" style="padding:6px 12px;text-align:right;font-size:12px;color:#64748b;">CGST @ ${taxes.cgst}%</td>
            <td style="padding:6px 12px;text-align:right;font-size:13px;">₹ ${fmt(cgst)}</td>
          </tr>
          <tr style="background:#f8fafc;">
            <td colspan="5" style="padding:6px 12px;text-align:right;font-size:12px;color:#64748b;">SGST @ ${taxes.sgst}%</td>
            <td style="padding:6px 12px;text-align:right;font-size:13px;">₹ ${fmt(sgst)}</td>
          </tr>
          <tr style="background:#0f172a;color:#fff;">
            <td colspan="5" style="padding:14px 12px;text-align:right;font-size:14px;font-weight:700;">GRAND TOTAL</td>
            <td style="padding:14px 12px;text-align:right;font-size:16px;font-weight:800;color:#34d399;">₹ ${fmt(grandTotal)}</td>
          </tr>
        </tfoot>
      </table>

      <!-- Bank Details -->
      <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:16px 20px;margin-bottom:24px;font-size:12px;">
        <div style="font-size:11px;text-transform:uppercase;color:#64748b;letter-spacing:1px;margin-bottom:10px;">PAYMENT DETAILS</div>
        <table cellpadding="0" cellspacing="0">
          <tr><td style="color:#64748b;padding-right:16px;padding-bottom:4px;">Bank Name:</td><td style="font-weight:600;">${data.bankDetails?.bank || 'STATE BANK OF INDIA'}</td></tr>
          <tr><td style="color:#64748b;padding-right:16px;padding-bottom:4px;">Account No:</td><td style="font-weight:600;">${data.bankDetails?.accountNo || '-'}</td></tr>
          <tr><td style="color:#64748b;padding-right:16px;padding-bottom:4px;">IFSC Code:</td><td style="font-weight:600;">${data.bankDetails?.ifsc || '-'}</td></tr>
          <tr><td style="color:#64748b;padding-right:16px;">UPI ID:</td><td style="font-weight:600;">${data.bankDetails?.upiId || '-'}</td></tr>
        </table>
      </div>
    </div>

    <!-- Footer -->
    <div style="background:#0f172a;padding:20px 40px;text-align:center;color:#64748b;font-size:12px;">
      <div style="color:#94a3b8;">Thank you for your business! — <strong style="color:#34d399;">POWER LINES ELECTRICAL WORKS</strong></div>
      <div style="margin-top:6px;">gsaireddy.powerlineselectrical@gmail.com &nbsp;|&nbsp; +91 9676774370</div>
    </div>
  </div>
</body>
</html>`;
}

function buildQuotationHTML(data: Record<string, any>, message: string): string {
  const items: InvoiceItem[] = data.items || [];
  const taxes = data.taxes || { cgst: 9, sgst: 9 };
  const { subtotal, cgst, sgst, grandTotal } = calcTotals(items, taxes);

  const itemRows = items.map((item, i) => {
    let tot = item.price * item.quantity;
    if (item.discount > 0) {
      tot -= item.discountType === 'percentage' ? tot * (item.discount / 100) : item.discount;
    }
    return `
      <tr style="border-bottom:1px solid #e2e8f0; ${i % 2 === 0 ? 'background:#faf5ff;' : ''}">
        <td style="padding:10px 12px;">${i + 1}</td>
        <td style="padding:10px 12px; font-weight:600;">${item.name}</td>
        <td style="padding:10px 12px; color:#64748b;">${item.hsn || '-'}</td>
        <td style="padding:10px 12px; text-align:center;">${item.quantity} ${item.quantityUnit || ''}</td>
        <td style="padding:10px 12px; text-align:right;">₹ ${fmt(item.price)}</td>
        <td style="padding:10px 12px; text-align:right; font-weight:700;">₹ ${fmt(tot)}</td>
      </tr>`;
  }).join('');

  const customMsg = message.trim()
    ? `<div style="background:#fdf4ff; border-left:4px solid #a855f7; padding:16px 20px; margin-bottom:24px; border-radius:6px; color:#581c87; font-size:14px; line-height:1.6;">${message.replace(/\n/g, '<br>')}</div>`
    : '';

  const termsRows = (data.termsAndConditions || []).map((t: string, i: number) =>
    `<li style="margin-bottom:6px;">${t}</li>`
  ).join('');

  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"><title>Quotation ${data.quotationNo}</title></head>
<body style="margin:0;padding:0;font-family:'Segoe UI',Arial,sans-serif;background:#f1f5f9;color:#1e293b;">
  <div style="max-width:700px;margin:40px auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.10);">
    
    <!-- Header Banner -->
    <div style="background:linear-gradient(135deg,#1e1b4b 0%,#4c1d95 100%);padding:32px 40px;color:#fff;">
      <table width="100%" cellpadding="0" cellspacing="0">
        <tr>
          <td>
            <div style="font-size:22px;font-weight:800;letter-spacing:-0.5px;">POWER LINES ELECTRICAL WORKS</div>
            <div style="font-size:12px;color:#c4b5fd;margin-top:4px;">FLAT NO.13-178, NEAR BALAJI HOTEL, SANGAREDDY, TELANGANA-502325</div>
            <div style="font-size:12px;color:#c4b5fd;margin-top:2px;">GSTIN: 36PBJPK1510A1ZZ &nbsp;|&nbsp; Mobile: 9676774370</div>
          </td>
          <td align="right" valign="top">
            <div style="background:rgba(255,255,255,0.12);border-radius:8px;padding:12px 20px;display:inline-block;text-align:center;">
              <div style="font-size:11px;color:#c4b5fd;text-transform:uppercase;letter-spacing:1px;">QUOTATION</div>
              <div style="font-size:20px;font-weight:800;color:#e879f9;margin-top:2px;">${data.quotationNo}</div>
            </div>
          </td>
        </tr>
      </table>
    </div>

    <!-- Meta Row -->
    <div style="background:#faf5ff;border-bottom:1px solid #e9d5ff;padding:16px 40px;">
      <table width="100%" cellpadding="0" cellspacing="0">
        <tr>
          <td style="font-size:12px;color:#6d28d9;">Date: <strong style="color:#1e293b;">${(data.quotationDate || '').split('-').reverse().join('/')}</strong></td>
          <td style="font-size:12px;color:#6d28d9;text-align:center;">Valid Until: <strong style="color:#1e293b;">${(data.validUntil || '').split('-').reverse().join('/') || '-'}</strong></td>
          <td style="font-size:12px;color:#6d28d9;text-align:right;">Ref: <strong style="color:#1e293b;">${data.rgpNumber || '-'}</strong></td>
        </tr>
      </table>
    </div>

    <!-- Content Area -->
    <div style="padding:32px 40px;">
      ${customMsg}

      ${data.subject ? `<div style="background:#faf5ff;border:1px solid #e9d5ff;border-radius:8px;padding:14px 20px;margin-bottom:20px;"><div style="font-size:11px;text-transform:uppercase;color:#7c3aed;letter-spacing:1px;margin-bottom:6px;">SUBJECT</div><div style="font-size:14px;font-weight:600;">${data.subject}</div></div>` : ''}

      <!-- Bill To -->
      <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:16px 20px;margin-bottom:24px;">
        <div style="font-size:11px;text-transform:uppercase;color:#64748b;letter-spacing:1px;margin-bottom:8px;">QUOTED TO</div>
        <div style="font-size:16px;font-weight:700;">${data.billTo?.name || '-'}</div>
        ${data.billTo?.address ? `<div style="font-size:13px;color:#64748b;margin-top:4px;">${data.billTo.address}</div>` : ''}
        ${data.billTo?.gstin ? `<div style="font-size:12px;color:#64748b;margin-top:4px;">GSTIN: ${data.billTo.gstin}</div>` : ''}
      </div>

      <!-- Items Table -->
      <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e2e8f0;border-radius:8px;overflow:hidden;margin-bottom:20px;font-size:13px;">
        <thead>
          <tr style="background:#1e1b4b;color:#fff;">
            <th style="padding:12px;text-align:left;font-weight:600;width:30px;">#</th>
            <th style="padding:12px;text-align:left;font-weight:600;">Item Description</th>
            <th style="padding:12px;text-align:left;font-weight:600;">HSN</th>
            <th style="padding:12px;text-align:center;font-weight:600;">Qty</th>
            <th style="padding:12px;text-align:right;font-weight:600;">Rate</th>
            <th style="padding:12px;text-align:right;font-weight:600;">Amount</th>
          </tr>
        </thead>
        <tbody>${itemRows}</tbody>
        <tfoot>
          <tr style="border-top:1px solid #e2e8f0;background:#faf5ff;">
            <td colspan="5" style="padding:10px 12px;text-align:right;font-size:12px;color:#64748b;">Subtotal</td>
            <td style="padding:10px 12px;text-align:right;font-weight:600;">₹ ${fmt(subtotal)}</td>
          </tr>
          <tr style="background:#faf5ff;">
            <td colspan="5" style="padding:6px 12px;text-align:right;font-size:12px;color:#64748b;">CGST @ ${taxes.cgst}%</td>
            <td style="padding:6px 12px;text-align:right;font-size:13px;">₹ ${fmt(cgst)}</td>
          </tr>
          <tr style="background:#faf5ff;">
            <td colspan="5" style="padding:6px 12px;text-align:right;font-size:12px;color:#64748b;">SGST @ ${taxes.sgst}%</td>
            <td style="padding:6px 12px;text-align:right;font-size:13px;">₹ ${fmt(sgst)}</td>
          </tr>
          <tr style="background:#1e1b4b;color:#fff;">
            <td colspan="5" style="padding:14px 12px;text-align:right;font-size:14px;font-weight:700;">GRAND TOTAL</td>
            <td style="padding:14px 12px;text-align:right;font-size:16px;font-weight:800;color:#e879f9;">₹ ${fmt(grandTotal)}</td>
          </tr>
        </tfoot>
      </table>

      <!-- Terms -->
      ${termsRows ? `
      <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:16px 20px;font-size:12px;">
        <div style="font-size:11px;text-transform:uppercase;color:#64748b;letter-spacing:1px;margin-bottom:10px;">TERMS &amp; CONDITIONS</div>
        <ol style="margin:0;padding-left:16px;color:#475569;line-height:1.7;">${termsRows}</ol>
      </div>` : ''}
    </div>

    <!-- Footer -->
    <div style="background:#1e1b4b;padding:20px 40px;text-align:center;color:#c4b5fd;font-size:12px;">
      <div>Thank you for considering our services! — <strong style="color:#e879f9;">POWER LINES ELECTRICAL WORKS</strong></div>
      <div style="margin-top:6px;">gsaireddy.powerlineselectrical@gmail.com &nbsp;|&nbsp; +91 9676774370</div>
    </div>
  </div>
</body>
</html>`;
}

// ─── POST handler ────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const body: EmailPayload = await req.json();
    const { to, subject, message, type, documentData, pdfBase64 } = body;

    if (!to || !subject) {
      return NextResponse.json({ success: false, error: 'Missing required fields: to, subject' }, { status: 400 });
    }

    const gmailUser = process.env.GMAIL_USER;
    const gmailPass = process.env.GMAIL_APP_PASSWORD?.replace(/\s+/g, ''); // Ensure no spaces

    if (!gmailUser || !gmailPass) {
      return NextResponse.json(
        { success: false, error: 'Gmail credentials not configured. Please add GMAIL_USER and GMAIL_APP_PASSWORD to .env.local' },
        { status: 500 }
      );
    }

    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: gmailUser,
        pass: gmailPass,
      },
    });

    const html = type === 'invoice'
      ? buildInvoiceHTML(documentData, message)
      : buildQuotationHTML(documentData, message);

    const docNo = documentData.invoiceNo || documentData.quotationNo || 'Document';

    await transporter.sendMail({
      from: `"Power Lines Electrical Works" <${gmailUser}>`,
      to,
      subject,
      html,
      attachments: pdfBase64 ? [
        {
          filename: `${docNo}.pdf`,
          content: pdfBase64,
          encoding: 'base64'
        }
      ] : []
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('[send-email] Error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to send email' },
      { status: 500 }
    );
  }
}
