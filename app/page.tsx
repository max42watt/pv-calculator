'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  CustomerInputs,
  ExpertSettings,
  defaultExpertSettings,
  calculateSystem,
  CalculationResults,
} from '@/lib/calculations';

export default function Home() {
  const [customerInputs, setCustomerInputs] = useState<CustomerInputs>({
    householdConsumption: 4000,
    heatingConsumption: 24000,
    hasECar: false,
    eCarKm: 15000,
    pvSize: 10,
    batterySize: 10,
    hasEMS: true,
    totalInvestment: 35000,
    electricityPrice: 28,
    gasPrice: 11,
  });

  const [expertSettings, setExpertSettings] = useState<ExpertSettings>(defaultExpertSettings);
  const [results, setResults] = useState<CalculationResults | null>(null);

  useEffect(() => {
    // Load expert settings from localStorage
    const saved = localStorage.getItem('expertSettings');
    if (saved) {
      setExpertSettings(JSON.parse(saved));
    }
  }, []);

  useEffect(() => {
    // Auto-calculate on input change
    if (customerInputs.pvSize > 0) {
      const calc = calculateSystem(customerInputs, expertSettings);
      setResults(calc);
    }
  }, [customerInputs, expertSettings]);

  const handleInputChange = (field: keyof CustomerInputs, value: number | boolean) => {
    setCustomerInputs((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <div className="min-h-screen bg-[var(--color--light-grey)]">
      {/* Header */}
      <div className="bg-white border-b-2 border-[var(--color--medium-grey)] py-4 px-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <img src="/logo.svg" alt="42WATT Logo" className="h-12" />
          <Link
            href="/admin"
            className="px-4 py-2 bg-[var(--color--light-blue)] text-white font-semibold rounded-lg hover:bg-[var(--color--dark-blue)] transition-colors"
          >
            Admin
          </Link>
        </div>
      </div>

      {/* Title */}
      <div className="max-w-7xl mx-auto pt-8 px-4 text-center">
        <h1 className="text-3xl md:text-4xl font-bold text-[var(--color--dark-blue)] mb-2">
          PV & Wärmepumpe Rechner
        </h1>
        <p className="text-lg text-[var(--color--dark-grey)] mb-8">
          Berechnen Sie Ihre Ersparnis und Unabhängigkeit
        </p>
      </div>

      <div className="max-w-7xl mx-auto pb-12 px-4">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Input Form */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-2xl shadow-lg p-6 sticky top-4 max-h-[calc(100vh-2rem)] overflow-y-auto">
              <h2 className="text-2xl font-bold text-[var(--color--dark-blue)] mb-6">
                Ihre Eingaben
              </h2>

              {/* Current Consumption */}
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-[var(--color--black)] mb-4">
                  Mein aktueller Jahresverbrauch
                </h3>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-semibold text-[var(--color--black)] mb-2">
                      Haushaltsstrom (kWh)
                    </label>
                    <input
                      type="number"
                      value={customerInputs.householdConsumption}
                      onChange={(e) =>
                        handleInputChange('householdConsumption', parseFloat(e.target.value))
                      }
                      className="w-full px-4 py-2 border-2 border-[var(--color--medium-grey)] rounded-lg focus:border-[var(--color--light-blue)] focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-[var(--color--black)] mb-2">
                      Heizenergie Gas/Öl (kWh)
                    </label>
                    <input
                      type="number"
                      value={customerInputs.heatingConsumption}
                      onChange={(e) =>
                        handleInputChange('heatingConsumption', parseFloat(e.target.value))
                      }
                      className="w-full px-4 py-2 border-2 border-[var(--color--medium-grey)] rounded-lg focus:border-[var(--color--light-blue)] focus:outline-none"
                    />
                  </div>

                  <div className="pt-2">
                    <label className="flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={customerInputs.hasECar}
                        onChange={(e) => handleInputChange('hasECar', e.target.checked)}
                        className="w-5 h-5 text-[var(--color--light-blue)] rounded"
                      />
                      <span className="ml-3 text-sm font-semibold text-[var(--color--black)]">
                        Ich fahre ein E-Auto
                      </span>
                    </label>
                  </div>

                  {customerInputs.hasECar && (
                    <div>
                      <label className="block text-sm font-semibold text-[var(--color--black)] mb-2">
                        Jährliche Fahrleistung (km)
                      </label>
                      <input
                        type="number"
                        value={customerInputs.eCarKm}
                        onChange={(e) =>
                          handleInputChange('eCarKm', parseFloat(e.target.value))
                        }
                        className="w-full px-4 py-2 border-2 border-[var(--color--medium-grey)] rounded-lg focus:border-[var(--color--light-blue)] focus:outline-none"
                      />
                      <p className="text-xs text-[var(--color--dark-grey)] mt-1">
                        ≈ {Math.round((customerInputs.eCarKm / 100) * 20)} kWh Jahresverbrauch
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Planned System */}
              <div className="mb-6 pt-6 border-t border-[var(--color--medium-grey)]">
                <h3 className="text-lg font-semibold text-[var(--color--black)] mb-4">
                  Mein geplantes System
                </h3>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-semibold text-[var(--color--black)] mb-2">
                      Größe PV-Anlage: {customerInputs.pvSize} kWp
                    </label>
                    <input
                      type="range"
                      min="5"
                      max="20"
                      step="0.5"
                      value={customerInputs.pvSize}
                      onChange={(e) => handleInputChange('pvSize', parseFloat(e.target.value))}
                      className="w-full h-2 bg-[var(--color--medium-grey)] rounded-lg appearance-none cursor-pointer accent-[var(--color--light-blue)]"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-[var(--color--black)] mb-2">
                      Größe Speicher: {customerInputs.batterySize} kWh {customerInputs.batterySize === 0 && '(ohne Speicher)'}
                    </label>
                    <input
                      type="range"
                      min="0"
                      max="15"
                      step="0.5"
                      value={customerInputs.batterySize}
                      onChange={(e) =>
                        handleInputChange('batterySize', parseFloat(e.target.value))
                      }
                      className="w-full h-2 bg-[var(--color--medium-grey)] rounded-lg appearance-none cursor-pointer accent-[var(--color--light-blue)]"
                    />
                    <p className="text-xs text-[var(--color--dark-grey)] mt-1">
                      Tipp: Ein Speicher erhöht die Autarkie deutlich
                    </p>
                  </div>

                  <div className="pt-2">
                    <label className="flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={customerInputs.hasEMS}
                        onChange={(e) => handleInputChange('hasEMS', e.target.checked)}
                        className="w-5 h-5 text-[var(--color--light-blue)] rounded"
                      />
                      <span className="ml-3 text-sm font-semibold text-[var(--color--black)]">
                        Energiemanagementsystem (EMS)
                      </span>
                    </label>
                    <p className="text-xs text-[var(--color--dark-grey)] mt-1 ml-8">
                      Optimiert den Eigenverbrauch automatisch
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-[var(--color--black)] mb-2">
                      Investitionskosten (€)
                    </label>
                    <input
                      type="number"
                      value={customerInputs.totalInvestment}
                      onChange={(e) =>
                        handleInputChange('totalInvestment', parseFloat(e.target.value))
                      }
                      className="w-full px-4 py-2 border-2 border-[var(--color--medium-grey)] rounded-lg focus:border-[var(--color--light-blue)] focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Current Energy Costs */}
              <div className="pt-6 border-t border-[var(--color--medium-grey)]">
                <h3 className="text-lg font-semibold text-[var(--color--black)] mb-4">
                  Meine aktuellen Energiekosten
                </h3>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-semibold text-[var(--color--black)] mb-2">
                      Strompreis (ct/kWh)
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      value={customerInputs.electricityPrice}
                      onChange={(e) =>
                        handleInputChange('electricityPrice', parseFloat(e.target.value))
                      }
                      className="w-full px-4 py-2 border-2 border-[var(--color--medium-grey)] rounded-lg focus:border-[var(--color--light-blue)] focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-[var(--color--black)] mb-2">
                      Gaspreis (ct/kWh)
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      value={customerInputs.gasPrice}
                      onChange={(e) =>
                        handleInputChange('gasPrice', parseFloat(e.target.value))
                      }
                      className="w-full px-4 py-2 border-2 border-[var(--color--medium-grey)] rounded-lg focus:border-[var(--color--light-blue)] focus:outline-none"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Results */}
          <div className="lg:col-span-2">
            {results && (
              <div className="space-y-6">
                {/* Summary Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-[var(--color--green)] text-white rounded-xl p-6">
                    <div className="text-sm opacity-90 mb-2">Jährliche Ersparnis</div>
                    <div className="text-3xl font-bold">
                      {results.yearlyTotalSavings.toLocaleString('de-DE')} €
                    </div>
                  </div>

                  <div className="bg-[var(--color--dark-blue)] text-white rounded-xl p-6">
                    <div className="text-sm opacity-90 mb-2">Autarkiegrad</div>
                    <div className="text-3xl font-bold">{results.autarkyRate}%</div>
                  </div>

                  <div className="bg-[var(--color--dark-blue)] text-white rounded-xl p-6">
                    <div className="text-sm opacity-90 mb-2">Amortisation</div>
                    <div className="text-3xl font-bold">
                      {results.amortizationYears} Jahre
                    </div>
                  </div>
                </div>

                {/* Annual Savings Details */}
                <div className="bg-white rounded-2xl shadow-lg p-6">
                  <h3 className="text-2xl font-bold text-[var(--color--dark-blue)] mb-4">
                    Ihre jährlichen Vorteile
                  </h3>

                  <div className="space-y-3">
                    <div className="flex justify-between items-center py-2 border-b border-[var(--color--light-grey)]">
                      <span className="text-[var(--color--black)]">
                        Gesparte Stromkosten (Eigenverbrauch)
                      </span>
                      <span className="font-bold text-[var(--color--green)]">
                        {results.yearlyElectricitySavings.toLocaleString('de-DE')} €
                      </span>
                    </div>

                    <div className="flex justify-between items-center py-2 border-b border-[var(--color--light-grey)]">
                      <span className="text-[var(--color--black)]">Einspeisevergütung</span>
                      <span className="font-bold text-[var(--color--green)]">
                        {results.yearlyFeedInRevenue.toLocaleString('de-DE')} €
                      </span>
                    </div>

                    <div className="flex justify-between items-center py-2 border-b border-[var(--color--light-grey)]">
                      <span className="text-[var(--color--black)]">Heizkosten gespart (WP vs. Gas)</span>
                      <span className="font-bold text-[var(--color--green)]">
                        {results.yearlyHeatingSavings.toLocaleString('de-DE')} €
                      </span>
                    </div>

                    {customerInputs.hasEMS && results.emsBonus > 0 && (
                      <div className="flex justify-between items-center py-2 border-b border-[var(--color--light-grey)]">
                        <span className="text-[var(--color--black)]">EMS-Optimierung</span>
                        <span className="font-bold text-[var(--color--green)]">
                          {results.emsBonus.toLocaleString('de-DE')} €
                        </span>
                      </div>
                    )}

                    <div className="flex justify-between items-center py-3 bg-[var(--color--light-green)] rounded-lg px-4 mt-4">
                      <span className="font-bold text-[var(--color--black)]">
                        Gesamtersparnis pro Jahr
                      </span>
                      <span className="font-bold text-2xl text-[var(--color--green)]">
                        {results.yearlyTotalSavings.toLocaleString('de-DE')} €
                      </span>
                    </div>
                  </div>
                </div>

                {/* System Performance */}
                <div className="bg-white rounded-2xl shadow-lg p-6">
                  <h3 className="text-2xl font-bold text-[var(--color--dark-blue)] mb-4">
                    Ihre neue Autarkiequote
                  </h3>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="text-center p-4 bg-[var(--color--light-grey)] rounded-lg">
                      <div className="text-2xl font-bold text-[var(--color--light-blue)]">
                        {results.pvProduction.toLocaleString('de-DE')}
                      </div>
                      <div className="text-sm text-[var(--color--dark-grey)]">
                        kWh PV-Ertrag
                      </div>
                    </div>

                    <div className="text-center p-4 bg-[var(--color--light-grey)] rounded-lg">
                      <div className="text-2xl font-bold text-[var(--color--light-blue)]">
                        {results.selfConsumption.toLocaleString('de-DE')}
                      </div>
                      <div className="text-sm text-[var(--color--dark-grey)]">
                        kWh Eigenverbrauch
                      </div>
                    </div>

                    <div className="text-center p-4 bg-[var(--color--light-grey)] rounded-lg">
                      <div className="text-2xl font-bold text-[var(--color--light-blue)]">
                        {results.autarkyRate}%
                      </div>
                      <div className="text-sm text-[var(--color--dark-grey)]">
                        Autarkie
                      </div>
                    </div>

                    <div className="text-center p-4 bg-[var(--color--light-grey)] rounded-lg">
                      <div className="text-2xl font-bold text-[var(--color--light-blue)]">
                        {results.selfConsumptionRate}%
                      </div>
                      <div className="text-sm text-[var(--color--dark-grey)]">
                        Eigenverbrauch
                      </div>
                    </div>
                  </div>

                  <div className="mt-6 p-4 bg-[var(--color--light-green)] rounded-lg">
                    <p className="text-sm text-[var(--color--black)]">
                      <strong>Ihr Strombedarf:</strong> {results.totalElectricityDemand.toLocaleString('de-DE')} kWh/Jahr
                      (Haushalt: {customerInputs.householdConsumption.toLocaleString('de-DE')} kWh
                      {customerInputs.hasECar && `, E-Auto: ${results.eCarConsumption.toLocaleString('de-DE')} kWh`}
                      , Wärmepumpe: {results.heatPumpConsumption.toLocaleString('de-DE')} kWh)
                      <br />
                      <strong>Vom Netz:</strong> {results.gridElectricity.toLocaleString('de-DE')} kWh
                      <br />
                      <strong>Einspeisung:</strong> {results.feedIn.toLocaleString('de-DE')} kWh
                    </p>
                  </div>
                </div>

                {/* Heating Comparison */}
                <div className="bg-white rounded-2xl shadow-lg p-6">
                  <h3 className="text-2xl font-bold text-[var(--color--dark-blue)] mb-4">
                    Vergleich: Gasheizung vs. Wärmepumpe
                  </h3>

                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b-2 border-[var(--color--medium-grey)]">
                          <th className="text-left py-3 px-4 font-semibold">Jahr</th>
                          <th className="text-right py-3 px-4 font-semibold">Gasheizung</th>
                          <th className="text-right py-3 px-4 font-semibold">Wärmepumpe</th>
                          <th className="text-right py-3 px-4 font-semibold text-[var(--color--green)]">
                            Ersparnis
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {results.heatingComparison.map((row, index) => (
                          <tr
                            key={row.year}
                            className={
                              index % 2 === 0 ? 'bg-[var(--color--light-grey)] bg-opacity-50' : ''
                            }
                          >
                            <td className="py-3 px-4 font-semibold">{row.year}</td>
                            <td className="text-right py-3 px-4">
                              {row.gasCosts.toLocaleString('de-DE')} €
                            </td>
                            <td className="text-right py-3 px-4">
                              {row.heatPumpCosts.toLocaleString('de-DE')} €
                            </td>
                            <td className="text-right py-3 px-4 font-bold text-[var(--color--green)]">
                              {row.savings.toLocaleString('de-DE')} €
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="mt-6 p-4 bg-[var(--color--yellow)] bg-opacity-20 rounded-lg">
                    <p className="text-sm text-[var(--color--black)] mb-3">
                      💡 Die Gaskosten steigen durch die CO₂-Steuer jedes Jahr deutlich an,
                      während Ihre Wärmepumpe größtenteils mit selbst erzeugtem Solarstrom läuft.
                    </p>
                    <p className="text-xs text-[var(--color--dark-grey)]">
                      <strong>Aktuelle Gaskosten:</strong> {customerInputs.gasPrice} ct/kWh für {customerInputs.heatingConsumption.toLocaleString('de-DE')} kWh = {Math.round((customerInputs.gasPrice / 100) * customerInputs.heatingConsumption).toLocaleString('de-DE')} € jährlich<br />
                      <strong>Jährliche Preissteigerungen:</strong> Strom: {expertSettings.electricityPriceIncrease}% | Gas: {expertSettings.gasPriceIncrease}% (zzgl. CO₂-Steuer)<br />
                      <strong>Autarkie-Steigerung:</strong> Speicher: +{expertSettings.batteryAutarkyBoost}% | EMS: +{expertSettings.emsAutarkyBoost}%
                    </p>
                  </div>
                </div>

                {/* Amortization & Profit */}
                <div className="bg-[var(--color--dark-blue)] text-white rounded-2xl shadow-lg p-6">
                  <h3 className="text-2xl font-bold mb-6">Wirtschaftlichkeit</h3>

                  <div className="space-y-4">
                    <div className="flex justify-between items-center py-3 border-b border-white border-opacity-20">
                      <span className="text-base">Investitionskosten</span>
                      <span className="font-bold text-xl">
                        {customerInputs.totalInvestment.toLocaleString('de-DE')} €
                      </span>
                    </div>

                    <div className="flex justify-between items-center py-3 border-b border-white border-opacity-20">
                      <span className="text-base">Durchschnittliche Ersparnis pro Jahr</span>
                      <span className="font-bold text-xl text-[var(--color--green)]">
                        {results.yearlyTotalSavings.toLocaleString('de-DE')} €
                      </span>
                    </div>

                    <div className="flex justify-between items-center py-4 bg-white rounded-lg px-4 border-2 border-white border-opacity-30">
                      <span className="text-lg font-semibold text-[var(--color--dark-blue)]">Amortisation nach</span>
                      <span className="font-bold text-3xl text-[var(--color--dark-blue)]">
                        {results.amortizationYears} Jahren
                      </span>
                    </div>

                    <div className="flex justify-between items-center py-4 bg-white rounded-lg px-4 border-2 border-white border-opacity-30">
                      <div>
                        <div className="text-sm text-[var(--color--dark-grey)]">Gewinn nach 20 Jahren</div>
                        <div className="font-bold text-3xl text-[var(--color--green)]">
                          {results.profitAfter20Years.toLocaleString('de-DE')} €
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="mt-6 p-4 bg-white rounded-lg">
                    <p className="text-sm leading-relaxed text-[var(--color--dark-blue)]">
                      ✅ Ihre Investition hat sich nach etwa <strong>{results.amortizationYears} Jahren</strong> amortisiert.
                      Danach profitieren Sie Jahr für Jahr von niedrigen Energiekosten
                      und maximaler Unabhängigkeit von Strom- und Gaspreisen.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
