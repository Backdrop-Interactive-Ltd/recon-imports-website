export const brandOptions = [
  { name: "BMW", slug: "bmw" },
  { name: "BYD", slug: "byd" },
  { name: "Honda", slug: "honda" },
  { name: "Lexus", slug: "lexus" },
  { name: "Mazda", slug: "mazda" },
  { name: "Mercedes-Benz", slug: "mercedes-benz" },
  { name: "Nissan", slug: "nissan" },
  { name: "Land Rover", slug: "land-rover" },
  { name: "Toyota", slug: "toyota" },
  { name: "Audi", slug: "audi" },
  { name: "Volkswagen", slug: "volkswagen" },
  { name: "Hyundai", slug: "hyundai" },
  { name: "Kia", slug: "kia" },
  { name: "Mitsubishi Motors", slug: "mitsubishi-motors" },
  { name: "Suzuki", slug: "suzuki" },
  { name: "Subaru", slug: "subaru" },
  { name: "Porsche", slug: "porsche" },
  { name: "Ferrari", slug: "ferrari" },
  { name: "Lamborghini", slug: "lamborghini" },
  { name: "Chevrolet", slug: "chevrolet" },
  { name: "Ford Motor Company", slug: "ford-motor-company" },
  { name: "Tesla", slug: "tesla" },
  { name: "Volvo Cars", slug: "volvo-cars" },
  { name: "Jaguar", slug: "jaguar" },
  { name: "Peugeot", slug: "peugeot" },
  { name: "Isuzu", slug: "isuzu" },
  { name: "Jeep", slug: "jeep" },
] as const;

export type BrandName = (typeof brandOptions)[number]["name"];

export function getBrandBySlug(slug: string) {
  return brandOptions.find((brand) => brand.slug === slug);
}
