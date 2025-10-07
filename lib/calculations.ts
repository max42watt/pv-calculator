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
  const batteryBoost = customer.batterySize > 0
    ? expert.batteryAutarkyBoost * Math.min(customer.batterySize / 10, 1) // Scale up to 10 kWh
    : 0;

  const emsBoost = customer.hasEMS ? expert.emsAutarkyBoost : 0;

  const autarkyRate = Math.min(
    expert.baseAutarky + batteryBoost + emsBoost,
    95 // Max 95% autarky (realistic limit)
  );

  // Self-consumption: How much of PV is used directly
  // We assume the battery and EMS help to shift PV production to match consumption
  const selfConsumption = Math.min(
    pvProduction,
    totalElectricityDemand * (autarkyRate / 100)
  );

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

  // EMS bonus calculation (if EMS is enabled)
  // EMS helps optimize consumption patterns, worth about 5-10% additional savings
  const emsBonusValue = customer.hasEMS
    ? (selfConsumption * 0.05 * (customer.electricityPrice / 100))
    : 0;

  // Cost of remaining grid electricity
  const gridElectricityCost =
    gridElectricity * (customer.electricityPrice / 100);

  // Old electricity cost (if still using gas heating)
  const oldElectricityCost =
    customer.householdConsumption * (customer.electricityPrice / 100);

  // Total yearly savings (including heat pump vs gas comparison - calculated below)
  const yearlyTotalSavings =
    yearlyElectricitySavings + yearlyFeedInRevenue + emsBonusValue;

  // 7. Heating comparison over 10 years
  const heatingComparison = [];
  let cumulativeGasCosts = 0;
  let cumulativeHeatPumpCosts = 0;

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

    cumulativeGasCosts += gasCosts;

    // Heat pump costs (electricity for heat pump)
    const electricityInflation = Math.pow(1 + expert.electricityPriceIncrease / 100, year - 1);
    const electricityPrice = (customer.electricityPrice / 100) * electricityInflation;

    // Heat pump uses electricity from grid (part not covered by PV)
    const heatPumpGridElectricity = Math.max(
      0,
      heatPumpConsumption - (selfConsumption * (heatPumpConsumption / totalElectricityDemand))
    );

    const heatPumpCosts = heatPumpGridElectricity * electricityPrice;
    cumulativeHeatPumpCosts += heatPumpCosts;

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
    emsBonus: Math.round(emsBonusValue),
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

export const defaultExpertSettings: ExpertSettings = {
  pvYieldPerKwp: 1200,
  heatPumpJAZ: 4,
  baseAutarky: 30,
  batteryAutarkyBoost: 25,
  emsAutarkyBoost: 15,
  feedInTariff: 8.0,
  electricityPriceIncrease: 3,
  gasPriceIncrease: 2,
  co2TaxSchedule: [
    { year: 2025, pricePerTon: 50 },
    { year: 2026, pricePerTon: 65 },
    { year: 2027, pricePerTon: 80 },
    { year: 2028, pricePerTon: 95 },
    { year: 2029, pricePerTon: 110 },
    { year: 2030, pricePerTon: 125 },
    { year: 2031, pricePerTon: 140 },
    { year: 2032, pricePerTon: 155 },
    { year: 2033, pricePerTon: 170 },
    { year: 2034, pricePerTon: 185 },
  ],
  co2EmissionsGas: 0.2,
};
