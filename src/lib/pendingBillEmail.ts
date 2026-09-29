import nodemailer from 'nodemailer';
import { PendingBill, BillFollowUp } from '@/types';

const OWNER_EMAIL = 'gsaireddy@powerlineselectricalwork.com';

function fmt(n: number) {
  return Number(n || 0).toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatDate(d?: string | null) {
  if (!d) return '-';
  const parts = d.split('-');
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  return d;
}

export async function sendPendingBillEmail({
  bill,
  followUp,
  actionType = 'followup',
  customNote,
}: {
  bill: PendingBill;
  followUp?: BillFollowUp;
  actionType?: 'new_bill' | 'followup' | 'promised' | 'reminder' | 'cleared';
  customNote?: string;
}): Promise<{ success: boolean; error?: string; messageId?: string }> {
  try {
    const gmailUser = process.env.GMAIL_USER;
    const gmailPass = process.env.GMAIL_APP_PASSWORD?.replace(/\s+/g, '');

    if (!gmailUser || !gmailPass) {
      console.warn('Gmail credentials not configured. Skipping email trigger.');
      return { success: false, error: 'Gmail credentials not configured in environment' };
    }

    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: gmailUser,
        pass: gmailPass,
      },
    });

    // Subject line based on action
    let subject = '';
    let badgeTitle = 'PAYMENT FOLLOW-UP ALERT';
    let badgeColor = '#f59e0b'; // Amber

    if (actionType === 'new_bill') {
      subject = `📋 [New Pending Bill] ${bill.billName} - ₹${fmt(bill.pendingAmount)} (Bill #${bill.billNo || 'N/A'})`;
      badgeTitle = 'NEW PENDING BILL RECORDED';
      badgeColor = '#3b82f6'; // Blue
    } else if (actionType === 'promised' || followUp?.promisedDate) {
      const promisedStr = formatDate(followUp?.promisedDate || bill.promisedDate);
      subject = `📅 [Payment Promised: ${promisedStr}] ${bill.billName} - ₹${fmt(bill.pendingAmount)}`;
      badgeTitle = `PROMISED PAYMENT: ${promisedStr}`;
      badgeColor = '#10b981'; // Emerald
    } else if (actionType === 'cleared') {
      subject = `✅ [Payment Cleared] ${bill.billName} - ₹${fmt(bill.pendingAmount)} Paid in Full`;
      badgeTitle = 'PAYMENT CLEARED & RECEIVED';
      badgeColor = '#059669'; // Green
    } else if (actionType === 'reminder') {
      subject = `⏰ [Payment Reminder] ${bill.billName} - Outstanding: ₹${fmt(bill.pendingAmount)}`;
      badgeTitle = 'PAYMENT FOLLOW-UP REMINDER';
      badgeColor = '#ef4444'; // Red
    } else {
      const mode = followUp?.mode || 'Call';
      subject = `⚡ [Payment Follow-up] ${bill.billName} - ₹${fmt(bill.pendingAmount)} (${mode})`;
      badgeTitle = `FOLLOW-UP LOGGED (${mode.toUpperCase()})`;
      badgeColor = '#f59e0b'; // Amber
    }

    // Follow-up history snippet (up to 4 past follow-ups)
    const historyRows = (bill.followUps || [])
      .slice(-4)
      .reverse()
      .map(
        (fu, idx) => `
        <tr style="border-bottom:1px solid #e2e8f0; font-size:12px; ${idx % 2 === 0 ? 'background:#f8fafc;' : ''}">
          <td style="padding:8px 12px; font-weight:600; color:#334155;">${formatDate(fu.date)}</td>
          <td style="padding:8px 12px; color:#475569;">${fu.mode || 'Call'}</td>
          <td style="padding:8px 12px; color:#1e293b;">${fu.notes || '-'}</td>
          <td style="padding:8px 12px; color:#0f766e; font-weight:600;">${fu.promisedDate ? formatDate(fu.promisedDate) : '-'}</td>
        </tr>`
      )
      .join('');

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
</head>
<body style="margin:0; padding:0; background:#0f172a; font-family:'Segoe UI',Arial,sans-serif; color:#334155;">
  <div style="max-width:680px; margin:30px auto; background:#ffffff; border-radius:14px; overflow:hidden; box-shadow:0 10px 35px rgba(0,0,0,0.35);">
    
    <!-- Top Brand Header -->
    <div style="background:linear-gradient(135deg,#0f172a 0%,#1e293b 50%,#0f766e 100%); padding:28px 36px; color:#ffffff;">
      <table width="100%" cellpadding="0" cellspacing="0">
        <tr>
          <td>
            <div style="font-size:11px; text-transform:uppercase; letter-spacing:2px; color:#2dd4bf; font-weight:700;">POWER LINES ELECTRICAL WORKS</div>
            <div style="font-size:22px; font-weight:800; color:#ffffff; margin-top:4px; letter-spacing:-0.5px;">Pending Bill & Payment Follow-up</div>
            <div style="font-size:12px; color:#94a3b8; margin-top:2px;">Automated Accounts & Collections Notification</div>
          </td>
          <td align="right" valign="top">
            <span style="display:inline-block; padding:6px 14px; background:${badgeColor}; color:#ffffff; font-size:10px; font-weight:800; letter-spacing:1px; border-radius:999px; text-transform:uppercase;">
              ${badgeTitle}
            </span>
          </td>
        </tr>
      </table>
    </div>

    <!-- Amount Hero Banner -->
    <div style="background:#f0fdf4; border-bottom:2px solid #bbf7d0; padding:22px 36px;">
      <table width="100%" cellpadding="0" cellspacing="0">
        <tr>
          <td>
            <div style="font-size:11px; font-weight:700; text-transform:uppercase; letter-spacing:1px; color:#166534;">Party / Customer Name</div>
            <div style="font-size:20px; font-weight:800; color:#0f172a; margin-top:2px;">${bill.billName}</div>
            <div style="font-size:12px; color:#64748b; margin-top:4px;">
              ${bill.billType || 'Bill'} #${bill.billNo || 'N/A'} &nbsp;•&nbsp; Status: <strong style="color:#0f766e;">${bill.status}</strong>
            </div>
          </td>
          <td align="right" valign="middle">
            <div style="font-size:11px; font-weight:700; text-transform:uppercase; letter-spacing:1px; color:#166534;">Outstanding Balance</div>
            <div style="font-size:26px; font-weight:900; color:#047857; margin-top:2px;">₹ ${fmt(bill.pendingAmount)}</div>
            ${bill.totalAmount && bill.totalAmount > bill.pendingAmount ? `<div style="font-size:11px; color:#64748b;">Total: ₹ ${fmt(bill.totalAmount)}</div>` : ''}
          </td>
        </tr>
      </table>
    </div>

    <!-- Follow-up Details Section -->
    <div style="padding:28px 36px;">
      
      ${followUp ? `
      <!-- Latest Follow-up Box -->
      <div style="background:#fefce8; border:1px solid #fef08a; border-left:5px solid #eab308; border-radius:10px; padding:18px 22px; margin-bottom:24px;">
        <div style="font-size:12px; font-weight:800; text-transform:uppercase; letter-spacing:1px; color:#854d0e; margin-bottom:10px;">
          📞 Latest Follow-up Details (${followUp.mode || 'Phone Call'})
        </div>
        <table width="100%" cellpadding="4" cellspacing="0" style="font-size:13px; color:#1e293b;">
          <tr>
            <td width="30%" style="color:#64748b; font-weight:600;">Followed Up By:</td>
            <td style="font-weight:700;">${followUp.followedUpBy || 'Team'}</td>
          </tr>
          <tr>
            <td style="color:#64748b; font-weight:600;">Follow-up Date:</td>
            <td style="font-weight:700;">${formatDate(followUp.date)} ${followUp.time || ''}</td>
          </tr>
          ${followUp.contactPerson ? `
          <tr>
            <td style="color:#64748b; font-weight:600;">Contact Person:</td>
            <td style="font-weight:700;">${followUp.contactPerson} ${followUp.contactPhone ? `(${followUp.contactPhone})` : ''}</td>
          </tr>` : ''}
          ${followUp.promisedDate ? `
          <tr>
            <td style="color:#0f766e; font-weight:700;">Promised Payment:</td>
            <td style="font-weight:800; color:#047857; font-size:14px; background:#dcfce7; padding:4px 8px; border-radius:4px; display:inline-block;">
              📅 ${formatDate(followUp.promisedDate)}
            </td>
          </tr>` : ''}
          ${followUp.nextFollowUpDate ? `
          <tr>
            <td style="color:#64748b; font-weight:600;">Next Follow-up Due:</td>
            <td style="font-weight:700; color:#b45309;">${formatDate(followUp.nextFollowUpDate)}</td>
          </tr>` : ''}
          <tr>
            <td style="color:#64748b; font-weight:600; vertical-align:top; padding-top:6px;">Follow-up Notes:</td>
            <td style="padding-top:6px; font-size:14px; line-height:1.5; color:#0f172a; font-weight:500;">
              "${followUp.notes || 'No remarks added.'}"
            </td>
          </tr>
        </table>
      </div>
      ` : ''}

      ${customNote ? `
      <div style="background:#eff6ff; border-left:4px solid #3b82f6; padding:14px 18px; border-radius:6px; font-size:13px; color:#1e3a8a; margin-bottom:20px;">
        <strong>Special Note:</strong> ${customNote}
      </div>
      ` : ''}

      <!-- Key Account Overview Table -->
      <div style="font-size:13px; font-weight:700; text-transform:uppercase; letter-spacing:1px; color:#0f172a; margin-bottom:12px;">
        📊 Bill & Contact Overview
      </div>
      <table width="100%" cellpadding="8" cellspacing="0" style="font-size:13px; border:1px solid #e2e8f0; border-radius:8px; border-collapse:collapse; margin-bottom:24px;">
        <tr style="background:#f8fafc; border-bottom:1px solid #e2e8f0;">
          <td style="color:#64748b; width:35%; font-weight:600;">Bill / Invoice No</td>
          <td style="font-weight:700; color:#0f172a;">${bill.billNo || 'N/A'} (${bill.billType})</td>
        </tr>
        <tr style="border-bottom:1px solid #e2e8f0;">
          <td style="color:#64748b; font-weight:600;">Bill Date</td>
          <td>${formatDate(bill.billDate)}</td>
        </tr>
        <tr style="background:#f8fafc; border-bottom:1px solid #e2e8f0;">
          <td style="color:#64748b; font-weight:600;">Payment Due Date</td>
          <td style="color:${bill.dueDate ? '#b91c1c' : '#334155'}; font-weight:600;">
            ${formatDate(bill.dueDate)}
          </td>
        </tr>
        <tr style="border-bottom:1px solid #e2e8f0;">
          <td style="color:#64748b; font-weight:600;">Contact Person</td>
          <td>${bill.contactPerson || '-'}</td>
        </tr>
        <tr style="background:#f8fafc; border-bottom:1px solid #e2e8f0;">
          <td style="color:#64748b; font-weight:600;">Contact Phone</td>
          <td>
            ${bill.contactPhone ? `<a href="tel:${bill.contactPhone}" style="color:#0f766e; font-weight:700; text-decoration:none;">${bill.contactPhone}</a>` : '-'}
          </td>
        </tr>
        <tr>
          <td style="color:#64748b; font-weight:600;">Total Follow-ups Logged</td>
          <td style="font-weight:700; color:#0f766e;">${bill.followUps?.length || 0} calls / interactions</td>
        </tr>
      </table>

      ${bill.followUps && bill.followUps.length > 1 ? `
      <!-- Past Follow-ups History -->
      <div style="font-size:13px; font-weight:700; text-transform:uppercase; letter-spacing:1px; color:#0f172a; margin-bottom:10px;">
        🕒 Recent Follow-up Log History
      </div>
      <table width="100%" cellpadding="6" cellspacing="0" style="border:1px solid #e2e8f0; border-collapse:collapse; margin-bottom:24px;">
        <thead>
          <tr style="background:#0f172a; color:#ffffff; font-size:11px; text-transform:uppercase;">
            <th style="padding:8px 12px; text-align:left;">Date</th>
            <th style="padding:8px 12px; text-align:left;">Mode</th>
            <th style="padding:8px 12px; text-align:left;">Remarks / Notes</th>
            <th style="padding:8px 12px; text-align:left;">Promised Date</th>
          </tr>
        </thead>
        <tbody>
          ${historyRows}
        </tbody>
      </table>
      ` : ''}

      <!-- Action Button -->
      <div style="text-align:center; padding:16px 0 8px 0;">
        <a href="https://power-lines-invoices.vercel.app/pending-bills" 
           style="background:#0f766e; color:#ffffff; padding:14px 28px; border-radius:8px; text-decoration:none; font-weight:700; font-size:14px; display:inline-block; box-shadow:0 4px 12px rgba(15,118,110,0.35);">
          🚀 Open Pending Bills Dashboard
        </a>
      </div>

    </div>

    <!-- Footer -->
    <div style="background:#0f172a; padding:22px 36px; text-align:center; color:#94a3b8; font-size:11px; line-height:1.6;">
      <div style="font-weight:700; color:#f1f5f9;">POWER LINES ELECTRICAL WORKS</div>
      <div>Flat No. 13-178, Near Balaji Hotel, Sangareddy, Telangana - 502325</div>
      <div style="margin-top:4px;">GSTIN: 36PBJPK1510A1ZZ &nbsp;|&nbsp; Mobile: +91 9676774370</div>
      <div style="margin-top:6px; color:#64748b;">
        This alert was generated automatically from the Power Lines Invoicing System.
      </div>
    </div>

  </div>
</body>
</html>`;

    const info = await transporter.sendMail({
      from: `"Power Lines Accounts Alert" <${gmailUser}>`,
      to: OWNER_EMAIL,
      subject,
      html,
    });

    console.log(`[PendingBillEmail] Alert sent to ${OWNER_EMAIL}. MessageId:`, info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error: any) {
    console.error('[PendingBillEmail] Error:', error);
    return { success: false, error: error.message || 'Failed to send follow-up email' };
  }
}
