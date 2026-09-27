const ones = [
  '', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
  'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen',
  'Seventeen', 'Eighteen', 'Nineteen'
];
const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

function twoDigits(n: number): string {
  if (n < 20) return ones[n];
  return (tens[Math.floor(n / 10)] + (n % 10 !== 0 ? ' ' + ones[n % 10] : '')).trim();
}

function threeDigits(n: number): string {
  if (n === 0) return '';
  if (n < 100) return twoDigits(n);
  const hundred = Math.floor(n / 100);
  const rest = n % 100;
  return ones[hundred] + ' Hundred' + (rest !== 0 ? ' and ' + twoDigits(rest) : '');
}

export function numberToWords(amount: number): string {
  if (isNaN(amount) || amount < 0) return '';
  if (amount === 0) return 'Zero Rupees Only';

  // Split into rupees and paise
  const rounded = Math.round(amount * 100) / 100;
  const rupees = Math.floor(rounded);
  const paise = Math.round((rounded - rupees) * 100);

  let result = '';

  if (rupees > 0) {
    const crore = Math.floor(rupees / 10000000);
    const lakh = Math.floor((rupees % 10000000) / 100000);
    const thousand = Math.floor((rupees % 100000) / 1000);
    const remainder = rupees % 1000;

    if (crore > 0) result += threeDigits(crore) + ' Crore ';
    if (lakh > 0) result += twoDigits(lakh) + ' Lakh ';
    if (thousand > 0) result += twoDigits(thousand) + ' Thousand ';
    if (remainder > 0) result += threeDigits(remainder);

    result = result.trim() + ' Rupees';
  }

  if (paise > 0) {
    result += (result ? ' and ' : '') + twoDigits(paise) + ' Paise';
  }

  return (result.trim() + ' Only').trim();
}
