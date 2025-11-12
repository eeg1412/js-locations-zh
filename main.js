const allCountries = new Set(["Australia","China","Japan","Korea (the Republic of)","Singapore","Hong Kong","Taiwan (Province of China)","United States of America"]);

export function getCountryData(country) {
  if (!allCountries.has(country)) {
    throw new Error(`Country '${country}' not found in translations`);
  }
  const sanitized = country.replace(/[^a-zA-Z0-9]/g, '_');
  return import(`./countries/${sanitized}.js`);
}

export function getAllCountries() {
  return Array.from(allCountries);
}
