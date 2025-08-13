
export function formatPhoneBR(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 11);
  if (digits.length <= 10) {
    // (00) 0000-0000
    return digits
      .replace(/^(\d{0,2})(\d{0,4})(\d{0,4}).*/, (_m, d1, d2, d3) => {
        let out = "";
        if (d1) out += `(${d1}`;
        if (d1 && d1.length === 2) out += `) `;
        if (d2) out += d2;
        if (d3) out += `-${d3}`;
        return out;
      });
  }
  // (00) 00000-0000
  return digits
    .replace(/^(\d{0,2})(\d{0,5})(\d{0,4}).*/, (_m, d1, d2, d3) => {
      let out = "";
      if (d1) out += `(${d1}`;
      if (d1 && d1.length === 2) out += `) `;
      if (d2) out += d2;
      if (d3) out += `-${d3}`;
      return out;
    });
}

export function unmaskPhoneBR(masked: string): string {
  return masked.replace(/\D/g, "");
}
