export const formatThaiDate = (dateStr) => {
  if (!dateStr || dateStr.includes('1899-12-30') || dateStr === '-') {
    return '-';
  }

  // ตัดขยะ 1899-12-30 ออก
  const cleanStr = dateStr.replace(/1899-12-30T[^\s]+/g, '').trim();
  const date = new Date(cleanStr);

  if (isNaN(date.getTime())) return '-';

  const months = [
    'ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.',
    'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'
  ];

  const day = date.getDate();
  const month = months[date.getMonth()];
  const year = date.getFullYear() + 543;
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');

  return `${day} ${month} ${year}, ${hours}:${minutes} น.`;
};