// Types
export interface CustomerInputs {
  householdConsumption: number; // kWh
  heatingConsumption: number; // kWh (Gas/Oil)
  hasECar: boolean;
  eCarKm: number; // km per year
  pvSize: number; // kWp
  batterySize: number; // kWh
  hasEMS: boolean; // Energy Management System
  totalInvestment: number; // €
  electricityPrice: number; // ct/kWh
  gasPrice: number; // ct/kWh
}

export interface ExpertSettings {
  pvYieldPerKwp: number; // kWh/kWp/year
  heatPumpJAZ: number; // Coefficient of Performance
  baseAutarky: number; // % without battery/EMS
  batteryAutarkyBoost: number; // % increase with battery
  emsAutarkyBoost: number; // % increase with EMS
  feedInTariff: number; // ct/kWh
  electricityPriceIncrease: number; // % per year
  gasPriceIncrease: number; // % per year
  co2TaxSchedule: { year: number; pricePerTon: number }[];
  co2EmissionsGas: number; // kg CO2 per kWh gas
}

export interface CalculationResults {
  // Annual savings
  yearlyElectricitySavings: number;
  yearlyFeedInRevenue: number;
  emsBonus: number;
  yearlyHeatingSavings: number;
  yearlyTotalSavings: number;

  // System performance
  pvProduction: number; // kWh/year
  selfConsumption: number; // kWh/year
  feedIn: number; // kWh/year
  autarkyRate: number; // %
  selfConsumptionRate: number; // %

  // E-Car
  eCarConsumption: number; // kWh/year

  // Heat pump
  heatPumpConsumption: number; // kWh/year

  // Total consumption
  totalElectricityDemand: number; // kWh/year
  gridElectricity: number; // kWh/year (what needs to be bought)

  // Heating comparison (10 years)
  heatingComparison: {
    year: number;
    gasCosts: number;
    heatPumpCosts: number;
    savings: number;
  }[];

  // Amortization
  amortizationYears: number;
  profitAfter20Years: number;
}

export function calculateSystem(
  customer: CustomerInputs,
  expert: ExpertSettings
): CalculationResults {
  // 1. PV Production
  const pvProduction = customer.pvSize * expert.pvYieldPerKwp;

  // 2. E-Car consumption (20 kWh per 100km)
  const eCarConsumption = customer.hasECar
    ? (customer.eCarKm / 100) * 20
    : 0;

  // 3. Heat pump consumption
  // Gas consumption / JAZ = electricity needed
  const heatPumpConsumption = customer.heatingConsumption / expert.heatPumpJAZ;

  // 4. Total electricity demand
  const totalElectricityDemand =
    customer.householdConsumption +
    eCarConsumption +
    heatPumpConsumption;

  // 5. Self-consumption calculation
  // Base autarky + increase from battery and/or EMS

  // ✅ Exponentielles Sättigungsmodell (bildet abnehmenden Grenznutzen ab)
  // Kleine Speicher (2-4 kWh): Schneller Anstieg (~15-20%)
  // Mittlere Speicher (6-8 kWh): Abflachung (~22-24%)
  // Große Speicher (10+ kWh): Sättigung bei ~25%
  const batteryBoost = customer.batterySize > 0
    ? expert.batteryAutarkyBoost * (1 - Math.exp(-customer.batterySize / 5))
    : 0;

  const emsBoost = customer.hasEMS ? expert.emsAutarkyBoost : 0;

  // ✅ Max-Autarkie auf 85% gedeckelt (realistisch für Jahresbilanz mit Winter-Defiziten)
  const autarkyRate = Math.min(
    expert.baseAutarky + batteryBoost + emsBoost,
    85 // Max 85% autarky (vorher 95%)
  );

  // Self-consumption: How much of PV is used directly
  // We assume the battery and EMS help to shift PV production to match consumption
  let selfConsumption = Math.min(
    pvProduction,
    totalElectricityDemand * (autarkyRate / 100)
  );

  // ✅ Speicherverluste berücksichtigen (10% Round-Trip-Verluste)
  if (customer.batterySize > 0) {
    const batteryUsage = Math.min(
      customer.batterySize * 365, // Maximale jährliche Nutzung (1x täglich)
      selfConsumption * 0.6 // Schätzung: 60% des Eigenverbrauchs läuft über Speicher
    );
    const batteryLosses = batteryUsage * 0.10; // 10% Verluste (konservativ)
    selfConsumption -= batteryLosses;
  }

  // Self-consumption rate: % of PV that is used
  const selfConsumptionRate = (selfConsumption / pvProduction) * 100;

  // Grid electricity needed
  const gridElectricity = totalElectricityDemand - selfConsumption;

  // Feed-in: Excess PV production
  const feedIn = Math.max(0, pvProduction - selfConsumption);

  // 6. Annual savings
  const yearlyElectricitySavings =
    selfConsumption * (customer.electricityPrice / 100);

  const yearlyFeedInRevenue =
    feedIn * (expert.feedInTariff / 100);

  // ✅ EMS-Bonus: Zeigt den finanziellen Wert der 15% zusätzlichen Autarkie
  // Berechnung: Zusätzlicher Eigenverbrauch durch EMS × Strompreis
  let emsBonus = 0;
  if (customer.hasEMS) {
    // Zusätzlicher Eigenverbrauch durch EMS
    const additionalSelfConsumption = Math.min(
      pvProduction,
      totalElectricityDemand * (emsBoost / 100)
    );
    emsBonus = additionalSelfConsumption * (customer.electricityPrice / 100);
  }

  // Total yearly savings (including heat pump vs gas comparison - calculated below)
  const yearlyTotalSavings =
    yearlyElectricitySavings + yearlyFeedInRevenue;

  // 7. Heating comparison over 10 years
  const heatingComparison = [];

  for (let year = 1; year <= 10; year++) {
    const yearNumber = 2025 + (year - 1);

    // Gas costs with CO2 tax
    const co2Tax = expert.co2TaxSchedule.find(s => s.year === yearNumber);
    const co2TaxPerKwh = co2Tax
      ? (expert.co2EmissionsGas * co2Tax.pricePerTon) / 1000
      : 0;

    const gasInflation = Math.pow(1 + expert.gasPriceIncrease / 100, year - 1);
    const gasBasePrice = customer.gasPrice / 100;
    const gasCosts =
      (gasBasePrice * gasInflation + co2TaxPerKwh) *
      customer.heatingConsumption;

    // Heat pump costs (electricity for heat pump)
    const electricityInflation = Math.pow(1 + expert.electricityPriceIncrease / 100, year - 1);
    const electricityPrice = (customer.electricityPrice / 100) * electricityInflation;

    // Heat pump uses electricity from grid (part not covered by PV)
    const heatPumpGridElectricity = Math.max(
      0,
      heatPumpConsumption - (selfConsumption * (heatPumpConsumption / totalElectricityDemand))
    );

    const heatPumpCosts = heatPumpGridElectricity * electricityPrice;

    heatingComparison.push({
      year: yearNumber,
      gasCosts: Math.round(gasCosts),
      heatPumpCosts: Math.round(heatPumpCosts),
      savings: Math.round(gasCosts - heatPumpCosts),
    });
  }

  // 8. Amortization
  // Average savings per year (considering price increases)
  const averageHeatingsSavings =
    heatingComparison.reduce((sum, y) => sum + y.savings, 0) /
    heatingComparison.length;

  const totalYearlySavingsIncludingHeating =
    yearlyTotalSavings + averageHeatingsSavings;

  const amortizationYears =
    customer.totalInvestment / totalYearlySavingsIncludingHeating;

  // 9. Profit after 20 years
  // Simplified: Assume average savings continue
  const totalSavings20Years = totalYearlySavingsIncludingHeating * 20;
  const profitAfter20Years = totalSavings20Years - customer.totalInvestment;

  return {
    yearlyElectricitySavings: Math.round(yearlyElectricitySavings),
    yearlyFeedInRevenue: Math.round(yearlyFeedInRevenue),
    emsBonus: Math.round(emsBonus),
    yearlyHeatingSavings: Math.round(averageHeatingsSavings),
    yearlyTotalSavings: Math.round(totalYearlySavingsIncludingHeating),
    pvProduction: Math.round(pvProduction),
    selfConsumption: Math.round(selfConsumption),
    feedIn: Math.round(feedIn),
    autarkyRate: Math.round(autarkyRate),
    selfConsumptionRate: Math.round(selfConsumptionRate),
    eCarConsumption: Math.round(eCarConsumption),
    heatPumpConsumption: Math.round(heatPumpConsumption),
    totalElectricityDemand: Math.round(totalElectricityDemand),
    gridElectricity: Math.round(gridElectricity),
    heatingComparison,
    amortizationYears: Math.round(amortizationYears * 10) / 10,
    profitAfter20Years: Math.round(profitAfter20Years),
  };
}

// CO₂-Steuer Szenarien
export const co2Scenarios = {
  conservative: [
    { year: 2025, pricePerTon: 55 },
    { year: 2026, pricePerTon: 58 },
    { year: 2027, pricePerTon: 61 },
    { year: 2028, pricePerTon: 64 },
    { year: 2029, pricePerTon: 67 },
    { year: 2030, pricePerTon: 70 },
    { year: 2031, pricePerTon: 73 },
    { year: 2032, pricePerTon: 76 },
    { year: 2033, pricePerTon: 79 },
    { year: 2034, pricePerTon: 82 },
  ],
  moderate: [
    { year: 2025, pricePerTon: 55 },
    { year: 2026, pricePerTon: 60 },
    { year: 2027, pricePerTon: 68 },
    { year: 2028, pricePerTon: 76 },
    { year: 2029, pricePerTon: 84 },
    { year: 2030, pricePerTon: 92 },
    { year: 2031, pricePerTon: 96 },
    { year: 2032, pricePerTon: 100 },
    { year: 2033, pricePerTon: 100 },
    { year: 2034, pricePerTon: 100 },
  ],
  aggressive: [
    { year: 2025, pricePerTon: 55 },
    { year: 2026, pricePerTon: 65 },
    { year: 2027, pricePerTon: 80 },
    { year: 2028, pricePerTon: 95 },
    { year: 2029, pricePerTon: 110 },
    { year: 2030, pricePerTon: 125 },
    { year: 2031, pricePerTon: 135 },
    { year: 2032, pricePerTon: 145 },
    { year: 2033, pricePerTon: 155 },
    { year: 2034, pricePerTon: 165 },
  ],
};

// Hilfsfunktion: Berechnet Heizkosten für ein bestimmtes CO₂-Szenario
export function calculateHeatingScenario(
  customer: CustomerInputs,
  expert: ExpertSettings,
  co2Schedule: { year: number; pricePerTon: number }[],
  years: number = 10
) {
  const comparison = [];

  for (let year = 1; year <= years; year++) {
    const yearNumber = 2025 + (year - 1);

    const co2Tax = co2Schedule.find(s => s.year === yearNumber);
    const co2TaxPerKwh = co2Tax
      ? (expert.co2EmissionsGas * co2Tax.pricePerTon) / 1000
      : 0;

    const gasInflation = Math.pow(1 + expert.gasPriceIncrease / 100, year - 1);
    const gasBasePrice = customer.gasPrice / 100;
    const gasCosts =
      (gasBasePrice * gasInflation + co2TaxPerKwh) *
      customer.heatingConsumption;

    comparison.push({
      year: yearNumber,
      gasCosts: Math.round(gasCosts),
    });
  }

  return comparison;
}

export const defaultExpertSettings: ExpertSettings = {
  pvYieldPerKwp: 1000,
  heatPumpJAZ: 4,
  baseAutarky: 30,
  batteryAutarkyBoost: 25,
  emsAutarkyBoost: 15,
  feedInTariff: 7.86, // ✅ Aktualisiert auf Aug 2025 Teileinspeisung bis 10 kWp
  electricityPriceIncrease: 1.25, // ✅ Korrigiert: BMWK-Prognose (vorher 3%)
  gasPriceIncrease: 2,
  co2TaxSchedule: co2Scenarios.moderate, // ✅ Moderate Szenario (Standard)
  co2EmissionsGas: 0.24, // ✅ Korrigiert: 0.24 kg CO₂/kWh (vorher 0.2)
};
