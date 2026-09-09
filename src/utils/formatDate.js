export const formatThaiDate = (dateStr) => {
  if (!dateStr || dateStr === '-') {
    return '-';
  }

  // จัดการกรณี Google Sheets คืนค่าเฉพาะเวลาซึ่งมักติด 1899-12-30 มาด้วย
  if (typeof dateStr === 'string' && dateStr.includes('1899-12-30')) {
    const timeMatch = dateStr.match(/(\d{2}):(\d{2})/);
    if (timeMatch) {
      return `${timeMatch[1]}:${timeMatch[2]} น.`;
    }
    return '-';
  }

  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return String(dateStr);

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