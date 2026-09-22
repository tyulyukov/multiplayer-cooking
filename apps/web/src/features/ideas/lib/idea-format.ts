const hryvnia = new Intl.NumberFormat("uk-UA", {
  style: "currency",
  currency: "UAH",
  maximumFractionDigits: 2,
});

export function formatPrice(value: number) {
  return hryvnia.format(value);
}

const quantityFormat = new Intl.NumberFormat("uk-UA", { maximumFractionDigits: 2 });

export function formatQuantity(value: number) {
  return quantityFormat.format(value);
}

export function itemsLabel(count: number) {
  const tens = count % 100;
  const ones = count % 10;

  if (ones === 1 && tens !== 11) {
    return `${count} товар`;
  }

  if (ones >= 2 && ones <= 4 && (tens < 12 || tens > 14)) {
    return `${count} товари`;
  }

  return `${count} товарів`;
}

export function servingsLabel(count: number) {
  if (count === 1) {
    return "1 порція";
  }

  if (count >= 2 && count <= 4) {
    return `${count} порції`;
  }

  return `${count} порцій`;
}
