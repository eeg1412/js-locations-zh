const allCountries = new Set(["Australia","China","Japan","Thailand","India","Malaysia","Korea (the Republic of)","Singapore","Hong Kong","Taiwan (Province of China)","United States of America","Netherlands (Kingdom of the)","Ireland","Germany","Argentina","France","Canada","Sweden","United Kingdom of Great Britain and Northern Ireland","Spain","Czechia","Belgium","Switzerland","Austria","Italy","Greece","Denmark","Portugal","Ghana","Finland","Poland","Romania","Norway","Luxembourg","Bulgaria","Moldova (the Republic of)","Latvia","Lithuania","Croatia","Estonia","Slovakia","Hungary","Malta","Cyprus","Zambia","Slovenia","Isle of Man","Albania","Papua New Guinea","Fiji","Macao","Tunisia","Paraguay","Botswana","Sudan","Gambia","Sierra Leone"]);

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
