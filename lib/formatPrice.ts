export function formatPrice(price: number) {
  return `BDT ${new Intl.NumberFormat("en-IN").format(price)}`;
}
